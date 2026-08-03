import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import emailjs from '@emailjs/browser';
import { jsPDF } from "jspdf";

/* ── Compute default valid-until date (30 days from now) ── */
function getDefaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

/* ── InputRow: editable cost line item ── */
function InputRow({ label, field, costs, onChange }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-[#F3F4F6] last:border-0">
      <span className="text-[13px] text-[#6B7280]">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#232B32]">₱</span>
        <input
          type="number"
          value={costs[field]}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-32 pl-7 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-right font-semibold text-[#232B32] focus:outline-none focus:border-[#C5A059] transition-colors"
        />
      </div>
    </div>
  );
}

export default function CreateQuotation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Cost Fields
  const [costs, setCosts] = useState({
    material: 0,
    fabrication: 0,
    installation: 0,
    edgePolishing: 0,
    mitering: 0,
    delivery: 0,
    mobilization: 0,
  });

  const [validUntil, setValidUntil] = useState(getDefaultValidUntil);
  const [terms, setTerms] = useState(
    "PAYMENT TERMS:\n- 60% of Total Contract Amount as down payment\n- 30% upon delivery\n- 10% balance upon completion of work\n\nOTHER TERMS:\n- Price quoted includes VAT (12%)\n- Warranty: 1 year on workmanship, manufacturer warranty on materials"
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch request data
      const { data: reqData, error: reqError } = await supabase
        .from('quotation_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (reqError || !reqData) {
        console.error("Error fetching request", reqError);
        navigate('/dashboard');
        return;
      }
      
      setRequest(reqData);

      // Fetch labor rates to prepopulate some fields
      const { data: rates } = await supabase.from('labor_rates').select('*');
      
      let defaultCosts = {
        material: reqData.material_cost || 0,
        fabrication: 0,
        installation: reqData.install_cost || 0,
        edgePolishing: 0,
        mitering: 0,
        delivery: 0,
        mobilization: 0,
      };

      if (rates) {
        const getRateAmount = (name) => {
          const rate = rates.find(r => r.item_name === name);
          return rate ? rate.rate_amount : 0;
        };

        const prod = (reqData.product_type || '').toLowerCase();
        
        const length = Number(reqData.length) || 0;
        const width = Number(reqData.width) || 0;
        const area = Number(reqData.area) || 0;

        // Linear Meter Calculations
        const perimeter = 2 * (length + width);
        const exposedEdge = length; // rough estimate for countertops

        // 1. Fixed / Flat Costs
        defaultCosts.delivery = getRateAmount('delivery_cost') || 3000;
        defaultCosts.mobilization = getRateAmount('mobilization_cost') || 2000;

        // 2. Installation (sqm)
        if (prod.includes('wall') || prod.includes('cladding')) {
          const wallRate = getRateAmount('wall_cladding') || 2600;
          defaultCosts.installation = wallRate * area;
        } else {
          const baseRate = getRateAmount('base_installation') || 1300;
          defaultCosts.installation = baseRate * area;
        }

        // 3. Cutting (lm) - Applies to all structures
        const cutRate = getRateAmount('cutting') || 250;
        defaultCosts.fabrication = cutRate * perimeter;

        // 4. Edge Polishing & Mitering (lm) - Applies mostly to Countertops
        if (prod.includes('counter') || prod.includes('top')) {
          const edgeRate = getRateAmount('edge_polishing') || 800;
          const miteringRate = getRateAmount('mitering') || 900;
          
          defaultCosts.edgePolishing = edgeRate * exposedEdge;
          defaultCosts.mitering = miteringRate * exposedEdge; 
        } else {
          defaultCosts.edgePolishing = 0;
          defaultCosts.mitering = 0;
        }
      }

      setCosts(defaultCosts);
      setLoading(false);
    };

    fetchData();
  }, [id, navigate]);

  const handleCostChange = (field, value) => {
    setCosts(prev => ({
      ...prev,
      [field]: Number(value)
    }));
  };

  const subtotal = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  const vat = subtotal * 0.12;
  const totalDue = subtotal + vat;

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSendQuotation = async () => {
    setSaving(true);
    try {
      // 1. Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add Logo
      const img = new Image();
      img.src = '/logo.png';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // proceed even if logo fails
      });
      
      try {
        // Approximate dimensions for the provided long rectangle logo
        doc.addImage(img, 'PNG', 14, 15, 90, 15);
      } catch(e) { console.error("Logo failed to draw", e); }

      doc.setFontSize(22);
      doc.setTextColor(35, 43, 50); // #232B32
      doc.text("Official Quotation", 14, 45);

      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // #6B7280
      doc.text(`Reference: ${request.request_id}`, 14, 52);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 58);
      doc.text(`Valid Until: ${validUntil}`, 14, 64);

      // Customer Info
      doc.setFontSize(12);
      doc.setTextColor(35, 43, 50);
      doc.text("Customer Information", 120, 45);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Name: ${request.full_name}`, 120, 52);
      doc.text(`Email: ${request.email}`, 120, 58);
      doc.text(`Phone: ${request.phone}`, 120, 64);

      // Line separator
      doc.setDrawColor(226, 232, 240); // #E2E8F0
      doc.line(14, 75, pageWidth - 14, 75);

      // Project Details
      doc.setFontSize(12);
      doc.setTextColor(35, 43, 50);
      doc.text("Project Specifications", 14, 85);
      
      doc.setFontSize(10);
      doc.text(`Product Type: ${request.product_type}`, 14, 93);
      doc.text(`Design: ${request.design}`, 14, 99);
      doc.text(`Dimensions: ${request.length}m x ${request.width}m`, 14, 105);
      doc.text(`Total Area: ${Number(request.area).toFixed(2)} sqm`, 14, 111);

      // Cost Breakdown
      let y = 130;
      doc.setFontSize(12);
      doc.text("Cost Breakdown", 14, y);
      y += 10;
      
      const drawRow = (label, val, isBold = false) => {
         doc.setFontSize(10);
         if(isBold) doc.setFont(undefined, 'bold');
         else doc.setFont(undefined, 'normal');
         doc.text(label, 14, y);
         // Strip the peso sign for the PDF since jsPDF standard fonts don't support it natively well
         // We will just use 'PHP' instead of the peso sign symbol in the PDF to prevent rendering bugs
         doc.text(`PHP ${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' });
         y += 8;
      };

      const prodStr = (request.product_type || '').toLowerCase();
      drawRow("Material Cost", costs.material);
      drawRow("Fabrication Cost", costs.fabrication);
      if (prodStr.includes('wall')) {
        drawRow("Installation (with Stainless Steel Anchor)", costs.installation);
      } else {
        drawRow("Installation Cost", costs.installation);
      }
      drawRow("Edge Polishing", costs.edgePolishing);
      drawRow("Mitering", costs.mitering);
      drawRow("Delivery Cost", costs.delivery);
      drawRow("Mobilization Cost", costs.mobilization);

      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;

      drawRow("Subtotal", subtotal);
      drawRow("VAT (12%)", vat);
      
      y += 4;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(197, 160, 89); // #C5A059 Gold
      doc.text("Total Amount Due", 14, y);
      doc.text(`PHP ${Number(totalDue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 14, y, { align: 'right' });

      // Terms
      y += 20;
      doc.setFontSize(12);
      doc.setTextColor(35, 43, 50);
      doc.text("Terms & Conditions", 14, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(undefined, 'normal');
      
      const splitTerms = doc.splitTextToSize(terms, pageWidth - 28);
      doc.text(splitTerms, 14, y);

      // Generate Blob and Upload to Supabase
      const pdfBlob = doc.output('blob');
      // eslint-disable-next-line -- Date.now() is safe inside an event handler, not during render
      const fileName = `Quotation_${request.request_id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('quotations')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error("PDF upload error:", uploadError);
        throw new Error("Failed to upload PDF quotation.");
      }

      // Get public URL (we still save it in DB for admin records)
      const { data: { publicUrl } } = supabase.storage.from('quotations').getPublicUrl(fileName);

      // 2. Send Email via EmailJS
      const templateParams = {
        to_name: request.full_name,
        to_email: request.email,
        request_id: request.request_id,
        product_type: request.product_type,
        design: request.design,
        area: request.area,
        subtotal: fmt(subtotal),
        vat: fmt(vat),
        total_due: fmt(totalDue),
        valid_until: validUntil,
        terms: terms,
        pdf_link: publicUrl
      };

      const SERVICE_ID = "service_jdqablg"; 
      const TEMPLATE_ID = "template_uzrfo2q";
      const PUBLIC_KEY = "Sc6zRHEuqJILL6S2A";

      if (PUBLIC_KEY) {
         await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      } else {
         console.log("EmailJS keys not set. Skipping email send. Template Params:", templateParams);
      }

      // 2. Save final quotation record / update status
      const { error } = await supabase
        .from('quotation_requests')
        .update({ 
          status: 'approved',
          total_cost: totalDue 
        })
        .eq('id', id);
        
      if (error) throw error;

      alert("Quotation successfully sent and approved!");
      navigate('/dashboard');

    } catch (err) {
      console.error("Failed to send quotation:", err);
      alert("Failed to send quotation. Please check the console.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB]">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-[#C5A059]" />
      </div>
    );
  }

  /* InputRow is defined at module level above — passes costs & onChange down */

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[#F9F9FB]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-[12px] font-semibold text-[#9CA3AF] hover:text-[#C5A059] transition-colors mb-4 uppercase tracking-widest"
          >
            &larr; Back to Admin Panel
          </button>
          <h1 className="text-3xl font-bold text-[#232B32]">Create Quotation</h1>
          <p className="text-[#6B7280] mt-1">For {request.full_name} - Request {request.request_id}</p>
        </div>

        {/* Customer Information Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0]">
          <h2 className="text-[16px] font-bold text-[#232B32] mb-6">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Customer Name</p>
              <p className="text-[14px] font-semibold text-[#232B32]">{request.full_name}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Email</p>
              <p className="text-[14px] font-semibold text-[#232B32]">{request.email}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Phone</p>
              <p className="text-[14px] font-semibold text-[#232B32]">{request.phone}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Request Date</p>
              <p className="text-[14px] font-semibold text-[#232B32]">{new Date(request.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Customer Request Card */}
        <div className="bg-[#FFFDF9] rounded-2xl p-6 md:p-8 shadow-sm border border-[#FDE68A]">
          <h2 className="text-[16px] font-bold text-[#232B32] mb-6">Customer Request</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Product Type</p>
              <p className="text-[16px] font-bold text-[#232B32]">{request.product_type}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Design Selected</p>
              <p className="text-[16px] font-bold text-[#232B32]">{request.design}</p>
            </div>
            <div className="col-span-1 md:col-span-2 grid grid-cols-3 pt-4 border-t border-[#F3F4F6]">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Width</p>
                <p className="text-[14px] font-bold text-[#232B32]">{request.width} m</p>
              </div>
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wider mb-1">Length</p>
                <p className="text-[14px] font-bold text-[#232B32]">{request.length} m</p>
              </div>
              <div>
                <p className="text-[11px] text-[#C5A059] uppercase tracking-wider mb-1">Total Area</p>
                <p className="text-[16px] font-bold text-[#D97706]">{Number(request.area).toFixed(2)} sqm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0]">
          <div className="mb-6">
            <h2 className="text-[16px] font-bold text-[#232B32]">Cost Breakdown</h2>
            <p className="text-[13px] text-[#6B7280]">Material, labor, and service costs (editable for custom projects)</p>
          </div>

          <div className="bg-[#EFF6FF] text-[#1E40AF] text-[12px] p-4 rounded-lg mb-6 flex gap-2">
            <span role="img" aria-label="tip">💡</span>
            <p><strong>Tip:</strong> Costs are automatically calculated based on area and product type. You can customize any value for special projects or custom requirements.</p>
          </div>

          <div className="space-y-2 border border-[#E2E8F0] p-6 rounded-xl">
            <InputRow label="Material Cost" field="material" costs={costs} onChange={handleCostChange} />
            <InputRow label="Fabrication Cost" field="fabrication" costs={costs} onChange={handleCostChange} />
            <InputRow 
              label={(request.product_type || '').toLowerCase().includes('wall') ? "Installation (with Stainless Steel Anchor)" : "Installation Cost"} 
              field="installation"
              costs={costs}
              onChange={handleCostChange}
            />
            <InputRow label="Edge Polishing" field="edgePolishing" costs={costs} onChange={handleCostChange} />
            <InputRow label="Mitering" field="mitering" costs={costs} onChange={handleCostChange} />
            <InputRow label="Delivery Cost" field="delivery" costs={costs} onChange={handleCostChange} />
            <InputRow label="Mobilization Cost" field="mobilization" costs={costs} onChange={handleCostChange} />

            {/* VAT */}
            <div className="flex justify-between items-center py-4 bg-[#F8FAFC] rounded-lg px-4 mt-4 border border-[#E2E8F0]">
              <span className="text-[13px] font-bold text-[#232B32]">Value Added Tax (12%)</span>
              <span className="text-[14px] font-bold text-[#232B32]">{fmt(vat)}</span>
            </div>
          </div>

          {/* Total Summary */}
          <div className="mt-8 flex justify-end">
            <div className="w-full md:w-1/2 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[13px] text-[#6B7280]">Subtotal (before tax):</span>
                <span className="text-[13px] font-semibold text-[#232B32]">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-[#F3F4F6]">
                <span className="text-[13px] text-[#6B7280]">Value Added Tax (12%):</span>
                <span className="text-[13px] font-semibold text-[#232B32]">{fmt(vat)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-bold text-[#232B32]">Total Amount Due:</span>
                <span className="text-[24px] font-bold text-[#D97706]">{fmt(totalDue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0]">
          <h2 className="text-[16px] font-bold text-[#232B32] mb-6">Additional Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Valid Until</label>
              <input 
                type="date" 
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="px-4 py-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[#232B32] w-full md:w-1/3 focus:outline-none focus:border-[#C5A059]"
              />
            </div>
            
            <div>
              <label className="block text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Notes / Terms & Conditions</label>
              <textarea 
                rows="7"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-4 py-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-[13px] text-[#232B32] leading-relaxed focus:outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-8 pb-10">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-4 bg-white border border-[#E2E8F0] text-[#232B32] font-semibold text-[14px] rounded-xl hover:bg-[#F9F9FB] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={handleSendQuotation}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-4 bg-[#D97706] text-white font-semibold text-[14px] rounded-xl hover:bg-[#B45309] transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md cursor-pointer"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
            Send Quotation to Client
          </button>
        </div>

      </div>
    </div>
  );
}
