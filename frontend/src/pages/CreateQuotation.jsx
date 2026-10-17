import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import emailjs from '@emailjs/browser';
import { jsPDF } from "jspdf";
import { useToast, ToastNotification } from "../utils/toast";
import {
  calculatePricing,
  getStructureCategory,
  DEFAULT_LABOR_RATES,
} from "../utils/pricingEngine";

/* ── Compute default valid-until date (30 days from now) ── */
function getDefaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

/* ── Format Currency ── */
const fmt = (n) =>
  `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtNumber = (n, decimals = 2) =>
  Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default function CreateQuotation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  // Dynamic rates map from Supabase
  const [laborRates, setLaborRates] = useState(DEFAULT_LABOR_RATES);

  // ── Project Metadata ──
  const [projectName, setProjectName] = useState("");
  const [projectCategory, setProjectCategory] = useState("countertop"); // 'countertop' | 'island' | 'wall' | 'flooring'
  const [stoneName, setStoneName] = useState("");
  const [stonePricePerSqm, setStonePricePerSqm] = useState("6500");
  const [itemTitle, setItemTitle] = useState("");

  // ── Customer Information & Site Address ──
  const [customerAddress, setCustomerAddress] = useState("");

  // ── Admin On-Site Inspected Laser Dimensions (Linear Meters) ──
  const [actualLength, setActualLength] = useState("1.20"); // in linear meters (m)
  const [actualWidth, setActualWidth] = useState("0.60");   // in linear meters (m)
  const [cuttingLength, setCuttingLength] = useState("");   // optional custom cutting linear meters (lm)
  const [exposedEdgeLength, setExposedEdgeLength] = useState(""); // optional custom exposed edge linear meters (lm)

  // ── Cutouts & Services (Countertops) ──
  const [sinkHoles, setSinkHoles] = useState(0);
  const [cooktopHoles, setCooktopHoles] = useState(0);
  const [customSinkRate, setCustomSinkRate] = useState("");
  const [customCooktopRate, setCustomCooktopRate] = useState("");

  // ── Logistics & Adjustments ──
  const [deliveryCost, setDeliveryCost] = useState("3000");
  const [mobilizationCost, setMobilizationCost] = useState("2000");
  const [discountType, setDiscountType] = useState("percent"); // 'percent' | 'amount'
  const [discountValue, setDiscountValue] = useState("");
  const [isVatIncluded, setIsVatIncluded] = useState(true);

  // ── Quotation Terms & Expiration ──
  const [validUntil, setValidUntil] = useState(getDefaultValidUntil);
  const [additionalTerms, setAdditionalTerms] = useState(
    "- Warranty: 1 year on workmanship; standard manufacturer warranty on natural stone/quartz\n- Site Readiness: Cabinets and substrates must be level, rigid, and fully cured prior to installation\n- Price quoted is in Philippine Pesos (PHP)\n- Any alterations or additional works requested on site will be billed separately"
  );

  // ── Fetch Initial Request & Rates ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reqRes, ratesRes, materialsRes] = await Promise.all([
          supabase.from('quotation_requests').select('*').eq('id', id).single(),
          supabase.from('labor_rates').select('*'),
          supabase.from('materials').select('id, name, price_per_sqm, color_url').order('name'),
        ]);

        if (reqRes.error || !reqRes.data) {
          console.error("Error fetching request", reqRes.error);
          showToast("Failed to load quotation request", "error");
          navigate('/dashboard');
          return;
        }

        const reqData = reqRes.data;
        setRequest(reqData);

        if (materialsRes.data) {
          setAvailableMaterials(materialsRes.data);
        }

        // Labor rates mapping
        let ratesMap = { ...DEFAULT_LABOR_RATES };
        if (ratesRes.data && ratesRes.data.length > 0) {
          ratesRes.data.forEach((r) => {
            ratesMap[r.item_name] = r.rate_amount;
          });
        }
        setLaborRates(ratesMap);

        // Deduce initial category
        const initialCategory = getStructureCategory(reqData.product_type, reqData.structure_type);
        setProjectCategory(initialCategory);

        // Clean base product type (e.g. "Kitchen Countertop", "Wall Cladding", "Flooring")
        const clientCity = reqData.address ? reqData.address.split(',').pop().trim() : 'Metro Manila';
        let rawProduct = (reqData.product_type || '').trim();

        // Strip previously accumulated suffixes so it NEVER duplicates or cascades
        let cleanBaseProduct = rawProduct
          .replace(/(w\/\s*splashboard\s*(&|and)\s*siding\s*)+/gi, '')
          .replace(/(\(using Stainless Steel Anchor\)\s*)+/gi, '')
          .replace(/(Installation\s*)+/gi, '')
          .replace(/(Project\s*\/.*)/gi, '')
          .trim();

        if (!cleanBaseProduct) {
          cleanBaseProduct = initialCategory === 'countertop' 
            ? 'Kitchen Countertop' 
            : (initialCategory === 'island'
                ? 'Kitchen Island'
                : (initialCategory === 'wall' ? 'Wall Cladding' : 'Flooring'));
        }

        // Set clean project name and clean item title
        setProjectName(`${cleanBaseProduct} Project / ${clientCity}`);
        
        if (initialCategory === 'countertop') {
          setItemTitle(`${cleanBaseProduct} w/ splashboard & siding`);
        } else if (initialCategory === 'island') {
          setItemTitle(`${cleanBaseProduct} w/ splashboard & siding`);
        } else if (initialCategory === 'wall') {
          setItemTitle('Wall Cladding Installation (using Stainless Steel Anchor)');
        } else {
          setItemTitle(`${cleanBaseProduct} Installation`);
        }

        // Material & Price per sqm
        const initialStone = reqData.design || 'Selected Stone';
        setStoneName(initialStone);

        let initialRatePerSqm = Number(reqData.rate_per_sqm) || 0;
        if (!initialRatePerSqm && materialsRes.data) {
          const match = materialsRes.data.find(
            (m) => m.name.toLowerCase() === initialStone.toLowerCase()
          );
          if (match) initialRatePerSqm = Number(match.price_per_sqm) || 0;
        }
        if (!initialRatePerSqm && Number(reqData.area) > 0 && Number(reqData.material_cost) > 0) {
          initialRatePerSqm = Math.round(Number(reqData.material_cost) / Number(reqData.area));
        }
        setStonePricePerSqm(String(initialRatePerSqm || 6500));

        // Customer Site / Home Address
        setCustomerAddress(reqData.address || "");

        // Initial Dimensions in linear meters (m) seeded safely from customer input
        const rawLen = parseFloat(reqData.length);
        const rawWid = parseFloat(reqData.width);
        const initialLen = (!isNaN(rawLen) && rawLen > 0) ? String(rawLen) : "1.20";
        const initialWid = (!isNaN(rawWid) && rawWid > 0) ? String(rawWid) : "0.60";
        setActualLength(initialLen);
        setActualWidth(initialWid);

        // Logistics defaults
        setDeliveryCost(String(ratesMap.delivery_cost || 3000));
        setMobilizationCost(String(ratesMap.mobilization_cost || 2000));

        // Terms from DB if present
        try {
          const { data: termsSetting } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'terms_and_conditions')
            .single();
          if (termsSetting?.value?.text) {
            setAdditionalTerms(termsSetting.value.text);
          }
        } catch (e) {
          console.warn('Could not read terms from app_settings:', e);
        }

      } catch (err) {
        console.error("Error initializing CreateQuotation:", err);
        showToast("Error loading quotation data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, showToast]);

  // ── Switch Material Handler ──
  const handleMaterialChange = (selectedName) => {
    setStoneName(selectedName);
    const found = availableMaterials.find((m) => m.name === selectedName);
    if (found && Number(found.price_per_sqm) > 0) {
      setStonePricePerSqm(String(found.price_per_sqm));
    }
  };

  // ── Switch Category Handler ──
  const handleCategoryChange = (cat) => {
    setProjectCategory(cat);
    const clientCity = customerAddress ? customerAddress.split(',').pop().trim() : 'Metro Manila';
    if (cat === 'countertop') {
      setItemTitle('Kitchen Countertop w/ splashboard & siding');
      setProjectName(`Kitchen Countertop Project / ${clientCity}`);
    } else if (cat === 'island') {
      setItemTitle('Kitchen Island w/ splashboard & siding');
      setProjectName(`Kitchen Island Project / ${clientCity}`);
    } else if (cat === 'wall') {
      setItemTitle('Wall Cladding Installation (using Stainless Steel Anchor)');
      setProjectName(`Wall Cladding Project / ${clientCity}`);
    } else if (cat === 'flooring') {
      setItemTitle('Flooring Installation');
      setProjectName(`Flooring Project / ${clientCity}`);
    }
  };

  // ── Numerical Parsing for Safe Computations ──
  const numLength = Math.max(0, parseFloat(actualLength) || 0);
  const numWidth = Math.max(0, parseFloat(actualWidth) || 0);
  const numPrice = Math.max(0, parseFloat(stonePricePerSqm) || 0);
  const numDelivery = Math.max(0, parseFloat(deliveryCost) || 0);
  const numMobilization = Math.max(0, parseFloat(mobilizationCost) || 0);
  const numDiscount = Math.max(0, parseFloat(discountValue) || 0);

  // ── Clean Automatic Laser Measurements (No manual override needed) ──
  // Length and Width are strictly in linear meters (m).
  // Total Area (m² / sqm) is calculated directly: Length (m) × Width (m).
  const effectiveArea = useMemo(() => {
    return Number((numLength * numWidth).toFixed(4));
  }, [numLength, numWidth]);

  // Perimeter / Cutting (linear meters - lm): 2 × (Length + Width)
  const defaultCutting = useMemo(() => {
    return Number((2 * (numLength + numWidth)).toFixed(2));
  }, [numLength, numWidth]);

  const effectiveCutting = useMemo(() => {
    if (cuttingLength !== "" && !isNaN(Number(cuttingLength))) {
      return Math.max(0, Number(cuttingLength));
    }
    return defaultCutting;
  }, [cuttingLength, defaultCutting]);

  // Exposed Edge Finishing (linear meters - lm) for countertops/islands: defaults to front length
  const defaultExposed = useMemo(() => {
    return (projectCategory === 'countertop' || projectCategory === 'island') ? Number(numLength.toFixed(2)) : 0;
  }, [numLength, projectCategory]);

  const effectiveExposed = useMemo(() => {
    if (exposedEdgeLength !== "" && !isNaN(Number(exposedEdgeLength))) {
      return Math.max(0, Number(exposedEdgeLength));
    }
    return defaultExposed;
  }, [exposedEdgeLength, defaultExposed]);

  // ── Comprehensive Dynamic Pricing via Centralized Engine ──
  const pricing = useMemo(() => {
    return calculatePricing({
      length: numLength,
      width: numWidth,
      area: effectiveArea,
      cuttingLength: effectiveCutting,
      exposedLength: effectiveExposed,
      sinkHoles: (projectCategory === 'countertop' || projectCategory === 'island') ? sinkHoles : 0,
      cooktopHoles: (projectCategory === 'countertop' || projectCategory === 'island') ? cooktopHoles : 0,
      projectCategory,
      pricePerSqm: numPrice,
      laborRates: {
        ...laborRates,
        ...(customSinkRate !== "" ? { sink_cutout: parseFloat(customSinkRate) || 0 } : {}),
        ...(customCooktopRate !== "" ? { cooktop_cutout: parseFloat(customCooktopRate) || 0 } : {}),
      },
      deliveryCost: numDelivery,
      mobilizationCost: numMobilization,
      discountType,
      discountPercent: discountType === 'percent' ? numDiscount : 0,
      discountAmount: discountType === 'amount' ? numDiscount : 0,
      isVatIncluded,
    });
  }, [
    numLength,
    numWidth,
    effectiveArea,
    effectiveCutting,
    effectiveExposed,
    sinkHoles,
    cooktopHoles,
    projectCategory,
    numPrice,
    laborRates,
    customSinkRate,
    customCooktopRate,
    numDelivery,
    numMobilization,
    discountType,
    numDiscount,
    isVatIncluded,
  ]);

  // ── Generate Official Six Sigmaphil Proposal PDF Document ──
  const buildOfficialProposalPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 12;

    // Pure White Top Header Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Attempt to load official logo image on white background
    try {
      const img = new Image();
      img.src = '/logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      if (img.width && img.height) {
        doc.addImage(img, 'PNG', margin, 6, 62, 17);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(35, 43, 50);
        doc.text("SIX SIGMAPHIL CORP.", margin, 18);
      }
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(35, 43, 50);
      doc.text("SIX SIGMAPHIL CORP.", margin, 18);
    }

    // Clean subtle gold accent line under the white header
    doc.setFillColor(197, 160, 89);
    doc.rect(margin, 25, contentWidth, 0.8, 'F');

    y = 33;

    // Project & Client Reference Block (Two neat columns, zero overlap)
    const rightColX = pageWidth - margin;
    const projectBoxWidth = contentWidth - 55; // 125mm max, guarantees Date on right never collides

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text("PROJECT :", margin, y);
    doc.setFont('helvetica', 'normal');
    
    // Split project text safely so it wraps onto next line if long instead of overlapping Date
    const splitProj = doc.splitTextToSize(projectName.toUpperCase(), projectBoxWidth - 22);
    doc.text(splitProj, margin + 22, y);

    // Right side: Date
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Date: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`, rightColX, y, { align: 'right' });

    y += Math.max(5.5, splitProj.length * 4.2 + 1);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text("CLIENT :", margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text((request?.full_name || 'Valued Client').toUpperCase(), margin + 22, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Valid Until: ${validUntil}`, rightColX, y, { align: 'right' });

    y += 5.5;
    const finalAddress = customerAddress || request?.address || 'Metro Manila';
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text("SITE / HOME ADDRESS : ", margin, y);
    const prefixWidth = doc.getTextWidth("SITE / HOME ADDRESS : ");
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const splitAddr = doc.splitTextToSize(finalAddress, contentWidth - prefixWidth - 5);
    doc.text(splitAddr, margin + prefixWidth, y);
    y += Math.max(5.5, splitAddr.length * 4.2);

    if (request?.phone || request?.email) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const contactInfo = [request.phone, request.email].filter(Boolean).join("  \u00b7  ");
      doc.text(`Contact: ${contactInfo}`, margin, y);
      y += 4.5;
    }

    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Salutation & Proposal Opening (Official Template wording)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(`Dear ${request?.full_name || 'Valued Client'},`, margin, y);
    y += 5.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const openingMsg = `In response to your request for the Supply & Installation of ${stoneName}, we are pleased to submit our proposal for your approval:`;
    const splitOpening = doc.splitTextToSize(openingMsg, contentWidth);
    doc.text(splitOpening, margin, y);
    y += splitOpening.length * 4.5 + 2;

    // Stone Designation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(197, 160, 89);
    doc.text(`STONE: ${stoneName.toUpperCase()}`, margin, y);
    y += 7;

    // ── Table Column Positions (Guarantees zero overlap & elegant spacing) ──
    const col1X = margin + 2;             // 17mm - Item / Description
    const col1SubX = margin + 6;          // 21mm - Indented Sub-item
    const col2X = margin + 55;            // 70mm - Quantity & Rate formula
    const col3X = margin + 130;           // 145mm - Sub-item Amount (right-aligned)
    const col4X = pageWidth - margin - 2; // 193mm - Category Total (right-aligned)

    // Table Header Box (Single instance - No duplicate)
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(35, 43, 50);
    doc.text(`I.  ${itemTitle}`, margin + 3, y + 4.5);
    y += 9.5;

    // Helper functions for clean tabular layout
    const printCategoryHeader = (title) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(35, 43, 50);
      doc.text(title, col1X, y);
      y += 4.8;
    };

    const printSubItem = (name, formula, amount) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      doc.text(name, col1SubX, y);
      if (formula) {
        doc.setTextColor(107, 114, 128);
        doc.text(formula, col2X, y);
      }
      if (amount) {
        doc.setTextColor(35, 43, 50);
        doc.text(amount, col3X, y, { align: 'right' });
      }
      y += 4.5;
    };

    // 1. Material Cost
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 43, 50);
    doc.text("Material Cost", col1X, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`${fmtNumber(effectiveArea)} sq.m @ PHP ${fmtNumber(stonePricePerSqm)} /sq.m`, col2X, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(`PHP ${fmtNumber(pricing.materialCost)}`, col4X, y, { align: 'right' });
    y += 6;

    // 2. Fabrication Cost
    printCategoryHeader("Fabrication Cost");
    printSubItem("Cutting", `${fmtNumber(effectiveCutting)} l.m @ PHP ${fmtNumber(pricing.cuttingRate)} /l.m`, `PHP ${fmtNumber(pricing.cuttingCost)}`);

    if (pricing.isCountertop && effectiveExposed > 0) {
      printSubItem("Miter Joint", `${fmtNumber(effectiveExposed)} l.m @ PHP ${fmtNumber(pricing.miteringRate)} /l.m`, `PHP ${fmtNumber(pricing.miteringCost)}`);
      printSubItem("Polished Edge", `${fmtNumber(effectiveExposed)} l.m @ PHP ${fmtNumber(pricing.edgeRate)} /l.m`, `PHP ${fmtNumber(pricing.edgePolishingCost)}`);
    }

    if (sinkHoles > 0) {
      printSubItem("Sink & faucet hole", `${sinkHoles} set(s) @ PHP ${fmtNumber(pricing.sinkRate)} /set`, `PHP ${fmtNumber(pricing.sinkCutoutCost)}`);
    }

    if (cooktopHoles > 0) {
      printSubItem("Cooktop hole", `${cooktopHoles} set(s) @ PHP ${fmtNumber(pricing.cooktopRate)} /set`, `PHP ${fmtNumber(pricing.cooktopCutoutCost)}`);
    }

    // Fabrication Group Total aligned in Col 4
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 43, 50);
    doc.text(`PHP ${fmtNumber(pricing.fabricationCost)}`, col4X, y - 4.5, { align: 'right' });
    y += 2;

    // 3. Installation Cost
    printCategoryHeader("Installation Cost");
    if (pricing.isWall) {
      printSubItem(
        "Wall Cladding w/ SS Anchor",
        `${fmtNumber(effectiveArea)} sq.m @ PHP ${fmtNumber(pricing.installRate)} /sq.m`,
        `PHP ${fmtNumber(pricing.installCost)}`
      );
    } else {
      printSubItem(
        "Base Installation",
        `${fmtNumber(effectiveArea)} sq.m @ PHP ${fmtNumber(pricing.installRate)} /sq.m`,
        `PHP ${fmtNumber(pricing.installCost)}`
      );
    }
    const finishingLm = pricing.isCountertop ? effectiveExposed : effectiveCutting;
    printSubItem("Linear Meter Finishing", `${fmtNumber(finishingLm)} l.m on-site finishing & alignment`, "Included");

    // Installation Group Total aligned in Col 4
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 43, 50);
    doc.text(`PHP ${fmtNumber(pricing.installCost)}`, col4X, y - 4.5, { align: 'right' });
    y += 3;

    // Sub-total Line
    doc.setDrawColor(209, 213, 219);
    doc.line(col3X - 20, y, col4X, y);
    y += 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 43, 50);
    doc.text("Sub-total", col3X, y, { align: 'right' });
    doc.text(`PHP ${fmtNumber(pricing.subtotal)}`, col4X, y, { align: 'right' });
    y += 5.5;

    // ── Summary Table (Aligned Right, matching authentic proposal) ──
    const summaryLabelX = col3X;
    const summaryValX = col4X;

    const printSummaryRow = (label, val, isBold = false, isRed = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(isRed ? 220 : (isBold ? 35 : 75), isRed ? 38 : (isBold ? 43 : 85), isRed ? 38 : (isBold ? 50 : 99));
      doc.text(label, summaryLabelX, y, { align: 'right' });
      doc.text(val, summaryValX, y, { align: 'right' });
      y += 4.2;
    };

    if (pricing.discountAmount > 0) {
      printSummaryRow("Total Amount:", `PHP ${fmtNumber(pricing.subtotal)}`);
      printSummaryRow(`Less ${fmtNumber(pricing.discountPercent)}% discount:`, `(PHP ${fmtNumber(pricing.discountAmount)})`, false, true);
      printSummaryRow("Net Amount:", `PHP ${fmtNumber(pricing.netAmount)}`, true);
    }

    printSummaryRow("Delivery Cost:", `PHP ${fmtNumber(pricing.deliveryCost)}`);
    printSummaryRow("Mobilization Cost:", `PHP ${fmtNumber(pricing.mobilizationCost)}`);

    y += 1.5;
    doc.setDrawColor(35, 43, 50);
    doc.setLineWidth(0.4);
    doc.line(col3X - 45, y, col4X, y);
    y += 5;

    // TOTAL CONTRACT AMOUNT Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(35, 43, 50);
    doc.text("TOTAL CONTRACT AMOUNT", col3X - 45, y);
    doc.setFontSize(10.5);
    doc.setTextColor(197, 160, 89);
    doc.text(`Php  ${fmtNumber(pricing.totalContractAmount)}`, col4X, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    const vatLabel = pricing.isVatIncluded ? "VAT INCLUDED" : "VAT NOT INCLUDED";
    doc.text(vatLabel, col4X, y, { align: 'right' });
    y += 6;

    // Check if new page is needed for Terms & Signatures
    if (y + 55 > pageHeight - margin) {
      doc.addPage();
      y = 20;
    }

    // Official Payment Terms & Conditions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35, 43, 50);
    doc.text("PAYMENT TERMS:", margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);

    const dp60 = fmtNumber(pricing.totalContractAmount * 0.6);
    const del30 = fmtNumber(pricing.totalContractAmount * 0.3);
    const bal10 = fmtNumber(pricing.totalContractAmount * 0.1);

    doc.text(`\u2022  60% of Total Contract Amount as down payment (PHP ${dp60})`, margin + 3, y);
    y += 4;
    doc.text(`\u2022  30% upon delivery of fabricated materials to site (PHP ${del30})`, margin + 3, y);
    y += 4;
    doc.text(`\u2022  10% balance upon complete turnover of work (PHP ${bal10})`, margin + 3, y);
    y += 5.5;

    // Additional Terms
    if (additionalTerms && additionalTerms.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(35, 43, 50);
      doc.text("OTHER TERMS & CONDITIONS:", margin, y);
      y += 3.8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 114, 128);
      const splitTerms = doc.splitTextToSize(additionalTerms.trim(), contentWidth);
      doc.text(splitTerms.slice(0, 3), margin + 3, y);
      y += Math.min(splitTerms.length, 3) * 3.5 + 4;
    }

    // Closing & Official Signatures
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text("Should there be any queries, please dont hesitate to call the undersigned.", margin, y);
    y += 6.5;

    // Signature Columns
    const sigY = y;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(35, 43, 50);
    doc.text("By:", margin, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text("Roland B. Koh", margin, sigY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text("General Manager", margin, sigY + 12);
    doc.text("SIX SIGMAPHIL CORP.", margin, sigY + 16);

    const clientColX = margin + contentWidth * 0.55;
    doc.setTextColor(35, 43, 50);
    doc.setFontSize(8);
    doc.text("Conforme:", clientColX, sigY);
    doc.setDrawColor(156, 163, 175);
    doc.line(clientColX, sigY + 8, pageWidth - margin, sigY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text(request?.full_name || 'Client Representative', clientColX, sigY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("Signature over Printed Name / Date", clientColX, sigY + 16);

    return doc;
  };

  // ── Save Specifications to Database (Syncs with Analytics & Insights) ──
  const handleSaveSpecifications = async () => {
    if (effectiveArea <= 0) {
      showToast('Please specify valid laser-measured dimensions. Area must be greater than 0 sqm.', 'error');
      return;
    }
    setSavingSpecs(true);
    try {
      const finalAddressVal = customerAddress || request.address || '';
      const finalProductType = projectCategory === 'island'
        ? 'Kitchen Island'
        : (projectCategory === 'wall'
            ? 'Wall Cladding'
            : (projectCategory === 'flooring' ? 'Flooring' : 'Kitchen Countertop'));

      const updatePayload = {
        length: numLength,
        width: numWidth,
        area: parseFloat(effectiveArea.toFixed(4)),
        rate_per_sqm: numPrice,
        material_cost: parseFloat(pricing.materialCost.toFixed(2)),
        install_cost: parseFloat(pricing.installCost.toFixed(2)),
        delivery_cost: parseFloat(pricing.deliveryCost.toFixed(2)),
        total_cost: parseFloat(pricing.totalContractAmount.toFixed(2)),
        design: stoneName,
        product_type: finalProductType,
        required_slabs: pricing.requiredSlabs || 1,
        address: finalAddressVal,
        remarks: `Specifications updated. Laser-measured: ${numLength}m × ${numWidth}m (${effectiveArea.toFixed(2)} sqm).`,
      };

      let { error: updateError } = await supabase
        .from('quotation_requests')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        const corePayload = {
          length: numLength,
          width: numWidth,
          area: parseFloat(effectiveArea.toFixed(4)),
          rate_per_sqm: numPrice,
          material_cost: parseFloat(pricing.materialCost.toFixed(2)),
          install_cost: parseFloat(pricing.installCost.toFixed(2)),
          delivery_cost: parseFloat(pricing.deliveryCost.toFixed(2)),
          total_cost: parseFloat(pricing.totalContractAmount.toFixed(2)),
          design: stoneName,
          product_type: finalProductType,
          address: finalAddressVal,
        };
        const retryRes = await supabase
          .from('quotation_requests')
          .update(corePayload)
          .eq('id', id);
        updateError = retryRes.error;
      }

      if (updateError) throw updateError;

      showToast(`Specifications updated! Stone (${stoneName}) and Project (${finalProductType}) synced to Insights.`, 'success');
      setRequest((prev) => ({ ...prev, ...updatePayload }));
    } catch (err) {
      console.error('Failed to update specifications:', err);
      showToast(err.message || 'Failed to update specifications', 'error');
    } finally {
      setSavingSpecs(false);
    }
  };

  // ── Download PDF Action ──
  const handleDownloadPdf = async () => {
    try {
      showToast("Generating official proposal PDF...", "info");
      const doc = await buildOfficialProposalPdf();
      const cleanRequestId = (request?.request_id || 'SixSigmaphil').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Proposal_${cleanRequestId}.pdf`);
      showToast("Proposal PDF downloaded successfully", "success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF", "error");
    }
  };

  // ── Submit & Approve Quotation ──
  const handleSendQuotation = async () => {
    if (effectiveArea <= 0) {
      showToast('Please specify valid laser-measured dimensions. Area must be greater than 0 sqm.', 'error');
      return;
    }

    if (numPrice <= 0) {
      showToast('Please specify a valid stone material rate per sqm.', 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Build PDF Document
      const doc = await buildOfficialProposalPdf();
      const pdfBlob = doc.output('blob');
      const cleanRequestId = (request.request_id || 'Proposal').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Proposal_${cleanRequestId}.pdf`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('quotations')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.warn("PDF storage upload error (non-fatal):", uploadError);
      }

      const { data: publicUrlData } = supabase.storage
        .from('quotations')
        .getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl || '';

      // 3. Send Email Alert via EmailJS
      const resolvedProjectTitle = projectName || `${itemTitle || request.product_type} Project`;
      const resolvedProductTitle = itemTitle || request.product_type || 'Custom Stone Countertop';

      const templateParams = {
        to_name: request.full_name,
        client_name: request.full_name,
        customer_name: request.full_name,
        to_email: request.email,
        client_email: request.email,
        request_id: request.request_id,
        order_id: request.request_id,
        project_name: resolvedProjectTitle,
        project: resolvedProjectTitle,
        project_type: resolvedProductTitle,
        product: resolvedProductTitle,
        product_type: resolvedProductTitle,
        item: resolvedProductTitle,
        item_name: resolvedProductTitle,
        order: resolvedProjectTitle,
        order_name: resolvedProjectTitle,
        service: resolvedProductTitle,
        structure: resolvedProductTitle,
        design: stoneName,
        stone: stoneName,
        stone_design: stoneName,
        material: stoneName,
        dimensions: `${numLength.toFixed(2)}m × ${numWidth.toFixed(2)}m`,
        area: `${effectiveArea.toFixed(2)} sqm`,
        subtotal: fmt(pricing.subtotal),
        discount_percent: pricing.discountPercent > 0 ? `${pricing.discountPercent.toFixed(1)}%` : '0%',
        discount_amount: pricing.discountAmount > 0 ? fmt(pricing.discountAmount) : 'N/A',
        discounted_subtotal: fmt(pricing.netAmount),
        vat: pricing.isVatIncluded ? fmt(pricing.vatCost) : 'VAT Not Included',
        total_due: fmt(pricing.totalContractAmount),
        valid_until: validUntil,
        terms: additionalTerms,
        pdf_link: publicUrl || 'Available on request',
        pdf_url: publicUrl || '',
        pdf_name: `Proposal_${request.request_id}.pdf`,
        link_name: `Proposal_${request.request_id}.pdf`,
      };

      const SERVICE_ID = "service_jdqablg";
      const TEMPLATE_ID = "template_uzrfo2q";
      const PUBLIC_KEY = "Sc6zRHEuqJILL6S2A";

      if (PUBLIC_KEY) {
        try {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        } catch (mailErr) {
          console.warn("EmailJS client dispatch notice:", mailErr);
        }
      }

      // 4. Update Database Record
      const finalAddressVal = customerAddress || request.address || '';
      const finalProductType = projectCategory === 'island'
        ? 'Kitchen Island'
        : (projectCategory === 'wall'
            ? 'Wall Cladding'
            : (projectCategory === 'flooring' ? 'Flooring' : 'Kitchen Countertop'));

      const updatePayload = {
        status: 'approved',
        length: numLength,
        width: numWidth,
        area: parseFloat(effectiveArea.toFixed(4)),
        rate_per_sqm: numPrice,
        material_cost: parseFloat(pricing.materialCost.toFixed(2)),
        install_cost: parseFloat(pricing.installCost.toFixed(2)),
        delivery_cost: parseFloat(pricing.deliveryCost.toFixed(2)),
        total_cost: parseFloat(pricing.totalContractAmount.toFixed(2)),
        design: stoneName,
        product_type: finalProductType,
        required_slabs: pricing.requiredSlabs || 1,
        address: finalAddressVal,
        remarks: `Official proposal approved. Laser-measured: ${numLength}m × ${numWidth}m (${effectiveArea.toFixed(2)} sqm).`,
      };

      let { error: updateError } = await supabase
        .from('quotation_requests')
        .update(updatePayload)
        .eq('id', id);

      // Fallback if newly added columns do not exist in live Supabase table
      if (updateError) {
        console.warn('Retrying update with core schema columns:', updateError.message);
        const corePayload = {
          status: 'approved',
          length: numLength,
          width: numWidth,
          area: parseFloat(effectiveArea.toFixed(4)),
          rate_per_sqm: numPrice,
          material_cost: parseFloat(pricing.materialCost.toFixed(2)),
          install_cost: parseFloat(pricing.installCost.toFixed(2)),
          delivery_cost: parseFloat(pricing.deliveryCost.toFixed(2)),
          total_cost: parseFloat(pricing.totalContractAmount.toFixed(2)),
          design: stoneName,
          product_type: finalProductType,
          address: finalAddressVal,
        };
        const retryRes = await supabase
          .from('quotation_requests')
          .update(corePayload)
          .eq('id', id);
        updateError = retryRes.error;
      }

      if (updateError) throw updateError;

      const successMsg = `Quotation proposal ${request.request_id} successfully approved and sent to client (${request.email})!`;
      showToast(successMsg, 'success');
      setTimeout(() => {
        navigate('/dashboard', {
          state: {
            toastMessage: successMsg,
            toastType: 'success',
          },
        });
      }, 2200);

    } catch (err) {
      console.error("Failed to approve quotation:", err);
      showToast(err.message || 'Failed to save and send quotation', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-3 border-t-transparent animate-spin border-[#C5A059] mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-[#6B7280]">Loading Quotation Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-8 bg-[#F9F9FB] text-[#232B32]">
      <ToastNotification toast={toast} onDismiss={dismissToast} position="bottom-right" />

      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] hover:text-[#C5A059] transition-colors mb-2 uppercase tracking-wider cursor-pointer"
            >
              &larr; Back to Admin Dashboard
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32]">
              Official Quotation Proposal Builder
            </h1>
            <p className="text-xs text-[#6B7280] mt-1">
              Reference: <span className="font-semibold text-[#232B32]">{request.request_id}</span> \u00b7 Client: <span className="font-semibold text-[#232B32]">{request.full_name}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2.5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#C5A059] text-[#232B32] text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Proposal
            </button>
          </div>
        </div>

        {/* Client Reference Summary Card */}
        <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#232B32]">
              1. Customer Initial Request &amp; Contact Information
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563]">
              Initial Online Submission
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#F9F9FB] p-3 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#6B7280] block text-[11px] mb-1">Customer Full Name</span>
              <p className="font-semibold text-[#232B32]">{request.full_name}</p>
            </div>
            <div className="bg-[#F9F9FB] p-3 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#6B7280] block text-[11px] mb-1">Email &amp; Phone</span>
              <p className="font-semibold text-[#232B32]">{request.email}</p>
              <p className="text-[#6B7280]">{request.phone}</p>
            </div>
            <div className="bg-[#F9F9FB] p-3 rounded-lg border border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#6B7280] block text-[11px] font-semibold">Site / Installation Address</span>
                <span className="text-[10px] text-[#C5A059] font-medium">Editable</span>
              </div>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Enter customer site / home address"
                className="w-full text-xs font-semibold text-[#232B32] bg-[#FFFFFF] border border-[#E2E8F0] rounded px-2 py-1.5 focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            <div className="bg-[#F9F9FB] p-3 rounded-lg border border-[#E2E8F0]">
              <span className="text-[#6B7280] block text-[11px] mb-1">Customer Initial Estimate</span>
              <p className="font-semibold text-[#232B32]">
                {Number(request.length || 0).toFixed(2)}m × {Number(request.width || 0).toFixed(2)}m
              </p>
              <p className="text-[#C5A059] font-bold">{Number(request.area || 0).toFixed(2)} sqm ({request.design})</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: EDITABLE ON-SITE INSPECTED DIMENSIONS */}
        <div className="bg-[#FFFFFF] rounded-xl p-6 border-2 border-[#C5A059]/40 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C5A059] animate-pulse" />
                <h2 className="text-base font-bold text-[#232B32]">
                  2. On-Site Inspected Dimensions &amp; Specifications
                </h2>
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Laser-measured on-site adjustments. Updating dimensions automatically recalculates material, fabrication, and installation rates.
              </p>
            </div>

            {/* Structure Category Selector & Quick Save */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('countertop')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    projectCategory === 'countertop'
                      ? 'bg-[#232B32] text-[#FFFFFF] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#232B32]'
                  }`}
                >
                  Countertop
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('island')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    projectCategory === 'island'
                      ? 'bg-[#232B32] text-[#FFFFFF] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#232B32]'
                  }`}
                >
                  Island
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('wall')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    projectCategory === 'wall'
                      ? 'bg-[#232B32] text-[#FFFFFF] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#232B32]'
                  }`}
                >
                  Wall Cladding
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('flooring')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    projectCategory === 'flooring'
                      ? 'bg-[#232B32] text-[#FFFFFF] shadow-sm'
                      : 'text-[#6B7280] hover:text-[#232B32]'
                  }`}
                >
                  Flooring
                </button>
              </div>

              {/* Quick Save Specs & Sync Insights button */}
              <button
                type="button"
                onClick={handleSaveSpecifications}
                disabled={savingSpecs}
                title="Save current stone material, project type, and dimensions to database and sync Insights"
                className="px-3 py-1.5 bg-[#FFFFFF] border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10 text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingSpecs ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                <span>Save Specs &amp; Sync Insights</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Column A: Project & Stone Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Project Title &amp; City (Header)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. QC Project Kitchen / Quezon City"
                  className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Customer Home / Site Address (Printed on Quotation &amp; PDF)
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. 123 Katipunan Ave, Quezon City"
                  className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Stone Material Selection
                </label>
                <select
                  value={stoneName}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="" disabled>-- Select Catalog Stone --</option>
                  {stoneName && !availableMaterials.some((m) => m.name.toLowerCase() === stoneName.toLowerCase()) && (
                    <option value={stoneName}>{stoneName} (Requested Stone)</option>
                  )}
                  {availableMaterials.map((m) => (
                    <option key={m.id || m.name} value={m.name}>
                      {m.name} (₱{Number(m.price_per_sqm).toLocaleString('en-PH')}/m²)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Material Rate (₱ per sq.m)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] font-semibold">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={stonePricePerSqm}
                    onChange={(e) => setStonePricePerSqm(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059] font-semibold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#232B32]">
                    {projectCategory === 'wall'
                      ? 'Installation: Stainless Steel Anchor'
                      : (projectCategory === 'flooring' ? 'Flooring Installation Rate' : 'Countertop Installation Rate')}
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/settings')}
                    className="text-[10px] text-[#C5A059] hover:underline font-medium cursor-pointer"
                    title="Edit standard rate in Settings"
                  >
                    Settings ↗
                  </button>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#232B32]">
                      ₱{Number(pricing.installRate).toLocaleString('en-PH')}
                    </span>
                    <span className="text-[#6B7280] text-[11px]">/ sq.m</span>
                    {projectCategory === 'wall' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30">
                        SS Anchor
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#6B7280]">
                    = {fmt(pricing.installCost)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Itemized Section Title
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. Kitchen Countertop w/ splashboard & siding"
                  className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#232B32] mb-1">
                  Proposal Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* Column B: Laser Measured Length, Width, Area */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#232B32] mb-1">
                    Actual Length (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={actualLength}
                    onChange={(e) => setActualLength(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] font-semibold focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-[#6B7280] mt-0.5 block">Linear meters (m)</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#232B32] mb-1">
                    Actual Width (m)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={actualWidth}
                    onChange={(e) => setActualWidth(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] font-semibold focus:outline-none focus:border-[#C5A059]"
                  />
                  <span className="text-[10px] text-[#6B7280] mt-0.5 block">Linear meters (m)</span>
                </div>
              </div>

              {/* Total Area Clean Display */}
              <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0]">
                <span className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                  Total Calculated Area (sq.m)
                </span>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[#C5A059]">
                      {effectiveArea.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-[#232B32]">sq.m (m²)</span>
                  </div>
                  <span className="text-[11px] text-[#6B7280]">
                    Auto: {numLength.toFixed(2)}m × {numWidth.toFixed(2)}m
                  </span>
                </div>
              </div>

              {/* Perimeter / Cutting Linear Meters (Auto-calculates from Length & Width) */}
              <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                    Perimeter / Cutting (linear meters - l.m)
                  </span>
                  {cuttingLength !== "" ? (
                    <button
                      type="button"
                      onClick={() => setCuttingLength("")}
                      className="text-[10px] text-[#C5A059] hover:underline cursor-pointer font-medium"
                    >
                      Reset to Auto
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCuttingLength(defaultCutting.toFixed(2))}
                      className="text-[10px] text-[#6B7280] hover:text-[#C5A059] hover:underline cursor-pointer"
                    >
                      Adjust Custom lm
                    </button>
                  )}
                </div>

                {cuttingLength !== "" ? (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={cuttingLength}
                        onChange={(e) => setCuttingLength(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#C5A059] rounded-md font-bold text-[#232B32] focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-[#232B32]">l.m</span>
                    </div>
                    <span className="text-[10px] text-[#6B7280] block mt-1">
                      Custom override active (Standard auto: {defaultCutting.toFixed(2)} l.m)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-[#232B32]">
                        {defaultCutting.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-[#6B7280]">l.m</span>
                    </div>
                    <span className="text-[11px] text-[#6B7280]">
                      Auto: 2 × ({numLength.toFixed(2)}m + {numWidth.toFixed(2)}m)
                    </span>
                  </div>
                )}
              </div>

              {/* Edge Finishing for Countertops (Auto-calculates from Length) */}
              {projectCategory === 'countertop' && (
                <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                      Exposed Edge Finishing (linear meters - l.m)
                    </span>
                    {exposedEdgeLength !== "" ? (
                      <button
                        type="button"
                        onClick={() => setExposedEdgeLength("")}
                        className="text-[10px] text-[#C5A059] hover:underline cursor-pointer font-medium"
                      >
                        Reset to Auto
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExposedEdgeLength(defaultExposed.toFixed(2))}
                        className="text-[10px] text-[#6B7280] hover:text-[#C5A059] hover:underline cursor-pointer"
                      >
                        Adjust Custom lm
                      </button>
                    )}
                  </div>

                  {exposedEdgeLength !== "" ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={exposedEdgeLength}
                          onChange={(e) => setExposedEdgeLength(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#C5A059] rounded-md font-bold text-[#232B32] focus:outline-none"
                        />
                        <span className="text-xs font-semibold text-[#232B32]">l.m</span>
                      </div>
                      <span className="text-[10px] text-[#6B7280] block mt-1">
                        Custom override active (Standard auto: {defaultExposed.toFixed(2)} l.m front edge)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-[#232B32]">
                          {defaultExposed.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-[#6B7280]">l.m</span>
                      </div>
                      <span className="text-[11px] text-[#6B7280]">
                        Auto: {numLength.toFixed(2)}m front edge
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Column C: Cutouts & Logistics Adjustments */}
            <div className="space-y-4">
              {projectCategory === 'countertop' ? (
                <>
                  <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <label className="block text-xs font-semibold text-[#232B32]">
                          Cutouts: Sink &amp; Faucet Hole (@ ₱{Number(pricing.sinkRate).toLocaleString('en-PH')}/set)
                        </label>
                        <span className="text-[10px] text-[#6B7280]">
                          Standard cutout rate from Settings
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/settings')}
                        className="text-[10px] text-[#C5A059] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                        title="Go to Admin Settings page"
                      >
                        Edit in Settings ↗
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setSinkHoles((prev) => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] font-bold text-[#232B32] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={sinkHoles}
                        onChange={(e) => setSinkHoles(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 text-center py-1.5 text-xs bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-bold text-[#232B32]"
                      />
                      <button
                        type="button"
                        onClick={() => setSinkHoles((prev) => prev + 1)}
                        className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] font-bold text-[#232B32] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-xs font-semibold text-[#6B7280] ml-auto">
                        {fmt(pricing.sinkCutoutCost)}
                      </span>
                    </div>

                    {/* Quick rate override for this quote */}
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Custom rate for this quote:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6B7280]">₱</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          placeholder={String(laborRates.sink_cutout || 2500)}
                          value={customSinkRate}
                          onChange={(e) => setCustomSinkRate(e.target.value)}
                          className="w-20 px-2 py-0.5 text-xs bg-[#FFFFFF] border border-[#E2E8F0] rounded font-semibold text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                        />
                        {customSinkRate !== "" && (
                          <button
                            type="button"
                            onClick={() => setCustomSinkRate("")}
                            className="text-[10px] text-[#C5A059] hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <label className="block text-xs font-semibold text-[#232B32]">
                          Cutouts: Cooktop Hole (@ ₱{Number(pricing.cooktopRate).toLocaleString('en-PH')}/set)
                        </label>
                        <span className="text-[10px] text-[#6B7280]">
                          Standard cutout rate from Settings
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/settings')}
                        className="text-[10px] text-[#C5A059] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
                        title="Go to Admin Settings page"
                      >
                        Edit in Settings ↗
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setCooktopHoles((prev) => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] font-bold text-[#232B32] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={cooktopHoles}
                        onChange={(e) => setCooktopHoles(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 text-center py-1.5 text-xs bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-bold text-[#232B32]"
                      />
                      <button
                        type="button"
                        onClick={() => setCooktopHoles((prev) => prev + 1)}
                        className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] font-bold text-[#232B32] hover:bg-[#E2E8F0] cursor-pointer"
                      >
                        +
                      </button>
                      <span className="text-xs font-semibold text-[#6B7280] ml-auto">
                        {fmt(pricing.cooktopCutoutCost)}
                      </span>
                    </div>

                    {/* Quick rate override for this quote */}
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0]/70 flex items-center justify-between text-[11px]">
                      <span className="text-[#6B7280]">Custom rate for this quote:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6B7280]">₱</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          placeholder={String(laborRates.cooktop_cutout || 1800)}
                          value={customCooktopRate}
                          onChange={(e) => setCustomCooktopRate(e.target.value)}
                          className="w-20 px-2 py-0.5 text-xs bg-[#FFFFFF] border border-[#E2E8F0] rounded font-semibold text-[#232B32] focus:outline-none focus:border-[#C5A059]"
                        />
                        {customCooktopRate !== "" && (
                          <button
                            type="button"
                            onClick={() => setCustomCooktopRate("")}
                            className="text-[10px] text-[#C5A059] hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : projectCategory === 'wall' ? (
                <div className="p-3.5 bg-[#F9F9FB] rounded-lg border-2 border-[#C5A059]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">
                      Wall Cladding Structure
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/settings')}
                      className="text-[10px] text-[#C5A059] hover:underline font-medium cursor-pointer"
                    >
                      Edit in Settings ↗
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#232B32]">
                      Installation using Stainless Steel Anchor (@ ₱2,600/sqm)
                    </label>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">
                      Vertical wall cladding mechanical anchorage system. Sink &amp; cooktop cutouts are omitted.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0] text-xs">
                    <span className="text-[#6B7280]">
                      {effectiveArea.toFixed(2)} sq.m × ₱{Number(pricing.installRate).toLocaleString('en-PH')}/sq.m
                    </span>
                    <span className="font-bold text-[#232B32]">
                      {fmt(pricing.installCost)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#F9F9FB] rounded-lg border border-[#E2E8F0] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      Flooring Structure
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/settings')}
                      className="text-[10px] text-[#C5A059] hover:underline font-medium cursor-pointer"
                    >
                      Edit in Settings ↗
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#232B32]">
                      Flooring Installation Rate (@ ₱1,300/sqm)
                    </label>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Standard floor bedding installation. Cutout surcharges do not apply.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#E2E8F0] text-xs">
                    <span className="text-[#6B7280]">
                      {effectiveArea.toFixed(2)} sq.m × ₱{Number(pricing.installRate).toLocaleString('en-PH')}/sq.m
                    </span>
                    <span className="font-bold text-[#232B32]">
                      {fmt(pricing.installCost)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#232B32] mb-1">
                    Delivery Cost (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] font-semibold focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#232B32] mb-1">
                    Mobilization (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={mobilizationCost}
                    onChange={(e) => setMobilizationCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] font-semibold focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#232B32]">
                      Discount
                    </label>
                    <div className="flex items-center bg-[#E2E8F0] p-0.5 rounded-md text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('percent');
                          setDiscountValue('');
                        }}
                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          discountType === 'percent'
                            ? 'bg-[#232B32] text-[#FFFFFF]'
                            : 'text-[#6B7280] hover:text-[#232B32]'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountType('amount');
                          setDiscountValue('');
                        }}
                        className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                          discountType === 'amount'
                            ? 'bg-[#232B32] text-[#FFFFFF]'
                            : 'text-[#6B7280] hover:text-[#232B32]'
                        }`}
                      >
                        ₱
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    {discountType === 'amount' && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] font-semibold">₱</span>
                    )}
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? 100 : undefined}
                      step={discountType === 'percent' ? "0.5" : "100"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'percent' ? "0%" : "0.00"}
                      className={`w-full ${discountType === 'amount' ? 'pl-7' : 'px-3'} pr-3 py-2 text-xs bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] font-semibold focus:outline-none focus:border-[#C5A059]`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#232B32] mb-1">
                    Tax Setting
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsVatIncluded((prev) => !prev)}
                    className={`w-full py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isVatIncluded
                        ? 'bg-[#232B32] text-[#C5A059] border-[#232B32]'
                        : 'bg-[#FFFFFF] text-[#6B7280] border-[#E2E8F0]'
                    }`}
                  >
                    {isVatIncluded ? 'VAT INCLUDED (12%)' : 'VAT NOT INCLUDED'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 3: OFFICIAL PROPOSAL PAPER PREVIEW (Matching Six Sigmaphil Document) */}
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] shadow-md overflow-hidden">
          {/* Document Header Bar */}
          <div className="bg-[#232B32] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between text-[#FFFFFF] border-b-2 border-[#C5A059]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">
                Live Document Preview
              </span>
              <h2 className="text-base font-bold tracking-wide">
                SIX SIGMAPHIL CORP. · FORMAL PROPOSAL
              </h2>
            </div>
            <div className="text-right text-xs text-[#9CA3AF] mt-2 md:mt-0">
              Proposal Ref: <span className="text-[#FFFFFF] font-semibold">{request.request_id}</span>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6 bg-[#FFFFFF] font-sans">
            {/* Meta Top Line */}
            <div className="flex flex-col md:flex-row md:items-start justify-between pb-4 border-b border-[#E2E8F0] text-xs gap-3">
              <div className="space-y-1">
                <p className="font-bold text-[#232B32] text-sm uppercase">PROJECT: {projectName}</p>
                <p className="text-[#232B32]"><strong className="text-[#6B7280]">Client:</strong> {request.full_name}</p>
                <p className="text-[#232B32]"><strong className="text-[#6B7280]">Site / Home Address:</strong> {customerAddress || request.address || 'Metro Manila'}</p>
                {(request.phone || request.email) && (
                  <p className="text-[#6B7280]">
                    <strong>Contact:</strong> {[request.phone, request.email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-left md:text-right text-[#6B7280] shrink-0 space-y-1">
                <p>Date: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p>Valid Until: <span className="font-semibold text-[#232B32]">{validUntil}</span></p>
              </div>
            </div>

            {/* Salutation & Official Stone Intro */}
            <div className="text-xs text-[#232B32] leading-relaxed">
              <p className="font-bold mb-1">Dear {request.full_name},</p>
              <p className="text-[#4B5563]">
                In response to your request for the Supply &amp; Installation of <strong className="text-[#232B32]">{stoneName}</strong>, we are pleased to submit our proposal for your approval:
              </p>
              <p className="font-bold text-[#C5A059] mt-2 text-sm tracking-wide">
                STONE: {stoneName.toUpperCase()}
              </p>
            </div>

            {/* Itemized Structure Cost Table */}
            <div className="border border-[#E2E8F0] rounded-lg overflow-x-auto">
              <div className="bg-[#F9F9FB] px-4 py-2.5 font-bold text-xs text-[#232B32] border-b border-[#E2E8F0]">
                I. {itemTitle}
              </div>

              <div className="divide-y divide-[#F3F4F6] text-xs">
                {/* Material Cost */}
                <div className="px-4 py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-[#232B32]">Material Cost</span>
                    <span className="text-[#6B7280] ml-3">
                      {fmtNumber(effectiveArea)} sq.m @ ₱{fmtNumber(stonePricePerSqm)} /sq.m
                    </span>
                  </div>
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.materialCost)}</span>
                </div>

                {/* Fabrication Cost */}
                <div className="px-4 py-2.5 bg-[#FAFBFD]">
                  <div className="flex justify-between items-center font-semibold text-[#232B32]">
                    <span>Fabrication Cost</span>
                    <span>{fmt(pricing.fabricationCost)}</span>
                  </div>
                  <div className="pl-4 pt-1.5 space-y-1 text-[11px] text-[#6B7280]">
                    <div className="flex justify-between">
                      <span>• Cutting</span>
                      <span>{fmtNumber(effectiveCutting)} l.m @ ₱{pricing.cuttingRate}/l.m = {fmt(pricing.cuttingCost)}</span>
                    </div>
                    {pricing.isCountertop && effectiveExposed > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>• Miter Joint</span>
                          <span>{fmtNumber(effectiveExposed)} l.m @ ₱{pricing.miteringRate}/l.m = {fmt(pricing.miteringCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Polished Edge</span>
                          <span>{fmtNumber(effectiveExposed)} l.m @ ₱{pricing.edgeRate}/l.m = {fmt(pricing.edgePolishingCost)}</span>
                        </div>
                      </>
                    )}
                    {sinkHoles > 0 && (
                      <div className="flex justify-between text-[#C5A059]">
                        <span>• Sink &amp; Faucet Hole</span>
                        <span>{sinkHoles} set(s) @ ₱{pricing.sinkRate}/set = {fmt(pricing.sinkCutoutCost)}</span>
                      </div>
                    )}
                    {cooktopHoles > 0 && (
                      <div className="flex justify-between text-[#C5A059]">
                        <span>• Cooktop Hole</span>
                        <span>{cooktopHoles} set(s) @ ₱{pricing.cooktopRate}/set = {fmt(pricing.cooktopCutoutCost)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Installation Cost */}
                <div className="px-4 py-2.5 bg-[#FAFBFD]">
                  <div className="flex justify-between items-center font-semibold text-[#232B32]">
                    <span>Installation Cost: {pricing.isWall ? 'Installation using Stainless Steel Anchor (@ ₱2,600/sqm)' : 'Base Installation (@ ₱1,300/sqm)'}</span>
                    <span>{fmt(pricing.installCost)}</span>
                  </div>
                  <div className="pl-4 pt-1.5 space-y-1 text-[11px] text-[#6B7280]">
                    <div className="flex justify-between">
                      <span>• {pricing.isWall ? 'Wall Cladding: Installation using Stainless Steel Anchor' : 'Area Installation (Flooring / Countertop)'}</span>
                      <span>{fmtNumber(effectiveArea)} sq.m @ ₱{fmtNumber(pricing.installRate)} /sq.m = {fmt(pricing.installCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Linear Meter Finishing</span>
                      <span>{fmtNumber(pricing.finishingLength)} l.m on-site finishing &amp; alignment (Included)</span>
                    </div>
                  </div>
                </div>

                {/* Sub-total */}
                <div className="px-4 py-2.5 flex justify-between items-center bg-[#F9F9FB] font-semibold text-[#232B32]">
                  <span>Sub-total</span>
                  <span>{fmt(pricing.subtotal)}</span>
                </div>

                {/* Discount */}
                {pricing.discountAmount > 0 && (
                  <>
                    <div className="px-4 py-2 flex justify-between items-center text-[#DC2626] font-semibold">
                      <span>{discountType === 'percent' ? `Less ${fmtNumber(pricing.discountPercent)}% discount` : 'Less Discount'}</span>
                      <span>-{fmt(pricing.discountAmount)}</span>
                    </div>
                    <div className="px-4 py-2 flex justify-between items-center bg-[#F9F9FB] font-semibold text-[#232B32]">
                      <span>Net Amount</span>
                      <span>{fmt(pricing.netAmount)}</span>
                    </div>
                  </>
                )}

                {/* Logistics */}
                <div className="px-4 py-2 flex justify-between items-center text-[#6B7280]">
                  <span>Delivery Cost (Site Delivery)</span>
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.deliveryCost)}</span>
                </div>
                <div className="px-4 py-2 flex justify-between items-center text-[#6B7280]">
                  <span>Mobilization Cost (Staging &amp; Tools)</span>
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.mobilizationCost)}</span>
                </div>

                {/* VAT if included */}
                <div className="px-4 py-2 flex justify-between items-center text-[#6B7280]">
                  <span>Value Added Tax ({pricing.vatRate}%)</span>
                  <span className="font-semibold text-[#232B32]">
                    {pricing.isVatIncluded ? fmt(pricing.vatCost) : 'VAT NOT INCLUDED (0%)'}
                  </span>
                </div>
              </div>

              {/* Total Contract Amount Grand Banner */}
              <div className="p-4 bg-[#232B32] text-[#FFFFFF] flex flex-col md:flex-row md:items-center justify-between gap-2 border-t-2 border-[#C5A059]">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#C5A059] block">
                    Final Certified Total
                  </span>
                  <span className="text-sm font-bold">
                    TOTAL CONTRACT AMOUNT ({pricing.isVatIncluded ? 'VAT INCLUDED' : 'VAT NOT INCLUDED'})
                  </span>
                </div>
                <span className="text-xl md:text-2xl font-bold text-[#C5A059]">
                  {fmt(pricing.totalContractAmount)}
                </span>
              </div>
            </div>

            {/* Official Terms & Conditions */}
            <div className="pt-4 border-t border-[#E2E8F0]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#232B32] mb-2">
                Official Payment Terms &amp; Conditions
              </h3>
              <div className="bg-[#F9F9FB] p-4 rounded-lg border border-[#E2E8F0] space-y-1.5 text-xs text-[#4B5563]">
                <p>
                  <strong>60%</strong> of Total Contract Amount as down payment upon confirmation:{' '}
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.totalContractAmount * 0.6)}</span>
                </p>
                <p>
                  <strong>30%</strong> upon delivery of fabricated materials to site:{' '}
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.totalContractAmount * 0.3)}</span>
                </p>
                <p>
                  <strong>10%</strong> balance upon completion and turnover of work:{' '}
                  <span className="font-semibold text-[#232B32]">{fmt(pricing.totalContractAmount * 0.1)}</span>
                </p>
              </div>

              {/* Editable Notes & Additional Terms */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-[#6B7280] mb-1">
                  Additional Notes / Special Conditions (Appears under Payment Terms)
                </label>
                <textarea
                  rows="4"
                  value={additionalTerms}
                  onChange={(e) => setAdditionalTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-xs text-[#232B32] focus:outline-none focus:border-[#C5A059] font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Closing & Signatures */}
            <div className="pt-4 border-t border-[#E2E8F0] text-xs">
              <p className="italic text-[#6B7280] mb-6">
                Should there be any queries, please dont hesitate to call the undersigned.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div>
                  <p className="text-[#6B7280]">Very truly yours,</p>
                  <p className="font-bold text-[#232B32] mt-1">SIX SIGMAPHIL CORP.</p>
                  <p className="font-bold text-[#232B32] mt-8">By: Roland B. Koh, General Manager</p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Conforme:</p>
                  <div className="mt-8 pt-1 border-t border-[#232B32]">
                    <p className="font-bold text-[#232B32]">{request.full_name}</p>
                    <p className="text-[11px] text-[#9CA3AF]">Client Signature over Printed Name / Date</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 4: ACTIONS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-12">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto px-6 py-3 bg-[#FFFFFF] border border-[#E2E8F0] hover:bg-[#F9F9FB] text-[#232B32] font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel &amp; Discard
          </button>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveSpecifications}
              disabled={savingSpecs || saving}
              className="flex-1 sm:flex-none px-5 py-3 bg-[#FFFFFF] border border-[#232B32] text-[#232B32] hover:bg-[#232B32] hover:text-[#FFFFFF] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingSpecs ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving Specs...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Save Specifications</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-none px-5 py-3 bg-[#FFFFFF] border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059]/10 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Export PDF Proposal
            </button>

            <button
              type="button"
              onClick={handleSendQuotation}
              disabled={saving || savingSpecs}
              className="flex-1 sm:flex-none px-8 py-3 bg-[#C5A059] hover:bg-[#B38F48] text-[#FFFFFF] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                  <span>Processing &amp; Sending...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span>Approve &amp; Send Proposal to Client</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
