import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';

const RATE_GROUPS = [
  {
    category: "Fabrication & Cutout Rates",
    description: "Cutting, profiling, sink and stove hole cutout rates for countertops.",
    keys: ["cutting", "edge_polishing", "mitering", "sink_cutout", "cooktop_cutout"]
  },
  {
    category: "Installation Rates",
    description: "Labor rates applied per square meter of stone installed.",
    keys: ["base_installation", "wall_cladding"]
  },
  {
    category: "Logistics & Site Mobilization",
    description: "Standard flat rates for transport and staging on job site.",
    keys: ["delivery_cost", "mobilization_cost"]
  }
];

const RATE_MAPPING = {
  cutting: { label: "Cutting / Fabrication", unit: "per linear meter", desc: "Perimeter and cut-to-size fabrication" },
  edge_polishing: { label: "Edge Polishing", unit: "per linear meter", desc: "Front visible edge polishing" },
  mitering: { label: "Mitering", unit: "per linear meter", desc: "45° edge bevel and miter joints" },
  sink_cutout: { label: "Sink & Faucet Cutout", unit: "per set", desc: "Includes sink hole cutout & faucet boring" },
  cooktop_cutout: { label: "Cooktop Cutout", unit: "per set", desc: "Includes stove/induction cutout & edge rounding" },
  base_installation: { label: "Base Installation Rate", unit: "per m²", desc: "Countertop and flooring installation" },
  wall_cladding: { label: "Wall Cladding (Installation using Stainless Steel Anchor)", unit: "per m²", desc: "Installation using Stainless Steel Anchor at ₱2,600 per square meter" },
  delivery_cost: { label: "Delivery Fee", unit: "base rate", desc: "Transport of fabricated stone to customer site" },
  mobilization_cost: { label: "Mobilization Fee", unit: "base rate", desc: "Crew staging, hoisting, and equipment mobilization" }
};

const AdminSettings = () => {
  const [rates, setRates] = useState({});
  const [rateIds, setRateIds] = useState({});
  const [unitTypes, setUnitTypes] = useState({});
  const [vat, setVat] = useState(12);
  const [vatId, setVatId] = useState(null);
  const [termsAndConditions, setTermsAndConditions] = useState(
    "PAYMENT TERMS:\n- 60% of Total Contract Amount as down payment\n- 30% upon delivery\n- 10% balance upon completion of work\n\nOTHER TERMS:\n- Price quoted includes VAT\n- Warranty: 1 year on workmanship, manufacturer warranty on materials"
  );
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [contactPhone, setContactPhone] = useState("0919 585 9959");
  const [contactEmail, setContactEmail] = useState("kyelopez706@gmail.com");
  const [contactFacebook, setContactFacebook] = useState("facebook.com/sixsigmaphil");
  const [contactViber, setContactViber] = useState("0919 585 9959");
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [isSavingVat, setIsSavingVat] = useState(false);
  const [showRateConfirm, setShowRateConfirm] = useState(false);
  const [showVatConfirm, setShowVatConfirm] = useState(false);

  const { toast, showToast, dismissToast } = useToast();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('labor_rates').select('*');
      if (error) throw error;
      
      const defaultRates = {
        base_installation: 1300,
        wall_cladding: 2600,
        cutting: 250,
        edge_polishing: 800,
        mitering: 900,
        sink_cutout: 2500,
        cooktop_cutout: 1800,
        delivery_cost: 3000,
        mobilization_cost: 2000,
      };
      const defaultUnits = {
        base_installation: "sqm",
        wall_cladding: "sqm",
        cutting: "lm",
        edge_polishing: "lm",
        mitering: "lm",
        sink_cutout: "set",
        cooktop_cutout: "set",
        delivery_cost: "flat_rate",
        mobilization_cost: "flat_rate",
      };

      const ratesData = { ...defaultRates };
      const idsData = {};
      const unitsData = { ...defaultUnits };
      let vatData = 12;
      let vId = null;
      let termsText = "PAYMENT TERMS:\n- 60% of Total Contract Amount as down payment\n- 30% upon delivery\n- 10% balance upon completion of work\n\nOTHER TERMS:\n- Price quoted includes VAT\n- Warranty: 1 year on workmanship, manufacturer warranty on materials";
      let contactPhoneData = "0919 585 9959";
      let contactEmailData = "kyelopez706@gmail.com";
      let contactFacebookData = "facebook.com/sixsigmaphil";
      let contactViberData = "0919 585 9959";
      
      data.forEach(item => {
        if (item.item_name === 'vat_percentage') {
          vatData = item.rate_amount;
          vId = item.id;
        } else if (item.item_name === 'terms_and_conditions') {
          // terms_and_conditions is stored in unit_type as a text blob
          termsText = item.unit_type || termsText;
        } else if (item.item_name === 'contact_info') {
          try {
            const parsed = JSON.parse(item.unit_type);
            if (parsed.phone) contactPhoneData = parsed.phone;
            if (parsed.email) contactEmailData = parsed.email;
            if (parsed.facebook) contactFacebookData = parsed.facebook;
            if (parsed.viber) contactViberData = parsed.viber;
          } catch (e) {
            console.warn("Failed to parse contact_info:", e);
          }
        } else if (RATE_MAPPING[item.item_name]) {
          ratesData[item.item_name] = item.rate_amount;
          idsData[item.item_name] = item.id;
          unitsData[item.item_name] = item.unit_type;
        }
      });
      
      // Load custom settings from app_settings if available
      try {
        const { data: settingsData } = await supabase.from('app_settings').select('*');
        if (settingsData && settingsData.length > 0) {
          settingsData.forEach(item => {
            if (item.key === 'contact_info' && item.value) {
              if (item.value.phone) contactPhoneData = item.value.phone;
              if (item.value.email) contactEmailData = item.value.email;
              if (item.value.facebook) contactFacebookData = item.value.facebook;
              if (item.value.viber) contactViberData = item.value.viber;
            } else if (item.key === 'terms_and_conditions' && item.value?.text) {
              termsText = item.value.text;
            }
          });
        }
      } catch (e) {
        console.warn('app_settings query error (table might need creation):', e);
      }

      setRates(ratesData);
      setRateIds(idsData);
      setUnitTypes(unitsData);
      setVat(vatData);
      setVatId(vId);
      setTermsAndConditions(termsText);
      setContactPhone(contactPhoneData);
      setContactEmail(contactEmailData);
      setContactFacebook(contactFacebookData);
      setContactViber(contactViberData);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
  }, [fetchSettings]);

  const handleRateChange = (key, value) => {
    setRates(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveRates = async () => {
    setIsSavingRates(true);
    setShowRateConfirm(false);
    try {
      for (const key of Object.keys(rates)) {
        const rateAmount = parseFloat(rates[key]) || 0;
        const unitType = unitTypes[key] || 'flat';

        if (rateIds[key]) {
          const { error } = await supabase
            .from('labor_rates')
            .update({ rate_amount: rateAmount, unit_type: unitType, updated_at: new Date().toISOString() })
            .eq('id', rateIds[key]);
          if (error) throw error;
        } else {
          // Check if item_name already exists in DB
          const { data: existing } = await supabase
            .from('labor_rates')
            .select('id')
            .eq('item_name', key)
            .maybeSingle();

          if (existing?.id) {
            const { error } = await supabase
              .from('labor_rates')
              .update({ rate_amount: rateAmount, unit_type: unitType, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('labor_rates')
              .insert([{ item_name: key, rate_amount: rateAmount, unit_type: unitType }]);
            if (error) throw error;
          }
        }
      }

      showToast('success', 'Rates updated successfully');
      fetchSettings(); // Refresh to get any new IDs
    } catch (error) {
      console.error('Error saving rates:', error);
      showToast('error', `Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSavingRates(false);
    }
  };

  const saveVat = async () => {
    setIsSavingVat(true);
    setShowVatConfirm(false);
    try {
      const payload = { 
        item_name: 'vat_percentage', 
        rate_amount: parseFloat(vat) || 0,
        unit_type: 'percentage' 
      };
      if (vatId) payload.id = vatId;

      const { error } = await supabase.from('labor_rates').upsert([payload]);
      if (error) throw error;
      
      showToast('success', 'Tax configuration updated successfully');
      fetchSettings(); // Refresh to get any new IDs
    } catch (error) {
      console.error('Error saving VAT:', error);
      showToast('error', `Failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSavingVat(false);
    }
  };

  // Save Terms & Conditions — stored in app_settings table
  const saveTerms = async () => {
    setIsSavingTerms(true);
    try {
      const payload = {
        key: 'terms_and_conditions',
        value: { text: termsAndConditions },
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      showToast('Terms & Conditions updated successfully', 'success');
      fetchSettings();
    } catch (error) {
      showToast(error.message || 'Failed to save terms', 'error');
    } finally {
      setIsSavingTerms(false);
    }
  };

  // Save Contact Information — stored in app_settings table
  const saveContactInfo = async () => {
    setIsSavingContact(true);
    try {
      const payload = {
        key: 'contact_info',
        value: {
          phone: contactPhone.trim(),
          email: contactEmail.trim(),
          facebook: contactFacebook.trim(),
          viber: contactViber.trim()
        },
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      showToast('Contact information updated successfully', 'success');
      fetchSettings();
    } catch (error) {
      console.error('Error saving contact info:', error);
      showToast(error.message || 'Failed to save contact info', 'error');
    } finally {
      setIsSavingContact(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 w-full min-h-screen bg-[#F9F9FB] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] w-full">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#232B32]">Settings</h1>
          <p className="text-[#6B7280] mt-2">Manage labor rates, taxes, and system configuration</p>
        </div>

        {/* Labor Rates Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
            <h2 className="text-lg font-semibold text-[#232B32]">Labor & Service Rates</h2>
            <p className="text-sm text-[#6B7280]">Update the default rates used in quotation calculations.</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-8">
              {RATE_GROUPS.map((group) => (
                <div key={group.category} className="space-y-3">
                  <div className="pb-2 border-b border-[#E2E8F0]">
                    <h3 className="text-sm font-bold text-[#232B32]">{group.category}</h3>
                    <p className="text-xs text-[#6B7280]">{group.description}</p>
                  </div>
                  <div className="space-y-3">
                    {group.keys.map((key) => {
                      const info = RATE_MAPPING[key];
                      if (!info) return null;
                      const isCutout = key === 'sink_cutout' || key === 'cooktop_cutout';
                      return (
                        <div
                          key={key}
                          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-xl border transition-all ${
                            isCutout
                              ? 'bg-[#FDFBF7] border-[#C5A059]/40'
                              : 'bg-[#F9F9FB] border-[#E2E8F0]'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="block text-sm font-semibold text-[#232B32]">
                                {info.label}
                              </label>
                              {isCutout && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C5A059]/15 text-[#C5A059]">
                                  Countertop Cutout
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280] mt-0.5">{info.desc || info.unit}</p>
                            <span className="text-[11px] font-semibold text-[#C5A059] block mt-0.5">
                              Rate unit: {info.unit}
                            </span>
                          </div>
                          <div className="w-full md:w-48 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280] font-semibold">₱</span>
                            <input
                              type="number"
                              value={rates[key] ?? ''}
                              onChange={(e) => handleRateChange(key, e.target.value)}
                              className="w-full pl-8 pr-4 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] text-[#232B32] font-semibold text-sm transition-colors"
                              placeholder="0.00"
                              min="0"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex justify-end">
              {showRateConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6B7280]">Confirm changes?</span>
                  <button
                    onClick={() => setShowRateConfirm(false)}
                    className="px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:text-[#232B32] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveRates}
                    disabled={isSavingRates}
                    className="px-6 py-2.5 bg-[#C5A059] text-[#FFFFFF] text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[120px]"
                  >
                    {isSavingRates ? 'Saving...' : 'Yes, Save Rates'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRateConfirm(true)}
                  className="px-6 py-2.5 bg-[#C5A059] text-[#FFFFFF] text-sm font-medium rounded-lg hover:brightness-110 transition-all"
                >
                  Save Rates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tax Configuration Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
            <h2 className="text-lg font-semibold text-[#232B32]">Tax Configuration</h2>
            <p className="text-sm text-[#6B7280]">Set the standard Value Added Tax (VAT) percentage.</p>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#232B32] mb-1">VAT Percentage</label>
                <span className="text-xs text-[#6B7280]">Applied to total materials and labor (unless zero-rated)</span>
              </div>
              <div className="w-full md:w-48 relative">
                <input
                  type="number"
                  value={vat ?? ''}
                  onChange={(e) => setVat(e.target.value)}
                  className="w-full pr-8 pl-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] text-[#232B32] transition-colors"
                  placeholder="12"
                  min="0"
                  max="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">%</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex justify-end">
              {showVatConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6B7280]">Confirm changes?</span>
                  <button
                    onClick={() => setShowVatConfirm(false)}
                    className="px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:text-[#232B32] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveVat}
                    disabled={isSavingVat}
                    className="px-6 py-2.5 bg-[#C5A059] text-[#FFFFFF] text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[120px]"
                  >
                    {isSavingVat ? 'Saving...' : 'Yes, Save Tax'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowVatConfirm(true)}
                  className="px-6 py-2.5 bg-[#C5A059] text-[#FFFFFF] text-sm font-medium rounded-lg hover:brightness-110 transition-all"
                >
                  Save Tax
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Terms & Conditions Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
            <h2 className="text-lg font-semibold text-[#232B32]">Terms &amp; Conditions</h2>
            <p className="text-sm text-[#6B7280]">This text will appear on every PDF quotation sent to clients.</p>
          </div>
          <div className="p-6">
            <textarea
              rows={10}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-4 py-3 bg-[#F9F9FB] border border-[#E2E8F0] rounded-xl text-sm text-[#232B32] font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-colors resize-y"
              placeholder="Enter your quotation terms and conditions..."
            />
            <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={saveTerms}
                disabled={isSavingTerms}
                className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[150px]"
              >
                {isSavingTerms ? 'Saving...' : 'Save Terms'}
              </button>
            </div>
          </div>
        </div>

        {/* Company Contact Information Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
            <h2 className="text-lg font-semibold text-[#232B32]">Company Contact Information</h2>
            <p className="text-sm text-[#6B7280]">Update the contact details displayed publicly on the Contact page.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#232B32] mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 0919 585 9959"
                  className="w-full px-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-sm text-[#232B32] focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#232B32] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. kyelopez706@gmail.com"
                  className="w-full px-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-sm text-[#232B32] focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#232B32] mb-1.5">Facebook Page</label>
                <input
                  type="text"
                  value={contactFacebook}
                  onChange={(e) => setContactFacebook(e.target.value)}
                  placeholder="e.g. facebook.com/sixsigmaphil"
                  className="w-full px-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-sm text-[#232B32] focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#232B32] mb-1.5">Viber Number</label>
                <input
                  type="text"
                  value={contactViber}
                  onChange={(e) => setContactViber(e.target.value)}
                  placeholder="e.g. 0919 585 9959"
                  className="w-full px-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg text-sm text-[#232B32] focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] transition-colors"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={saveContactInfo}
                disabled={isSavingContact}
                className="px-6 py-2.5 bg-[#C5A059] text-[#FFFFFF] text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[170px]"
              >
                {isSavingContact ? 'Saving...' : 'Save Contact Info'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && <ToastNotification {...toast} onDismiss={dismissToast} />}
    </div>
  );
};

export default AdminSettings;
