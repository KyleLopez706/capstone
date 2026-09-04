import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useToast, ToastNotification } from '../utils/toast';

const RATE_MAPPING = {
  base_installation: { label: "Base Installation Rate", unit: "per m²" },
  wall_cladding: { label: "Wall Cladding Rate", unit: "per m²" },
  cutting: { label: "Cutting / Fabrication", unit: "per linear meter" },
  edge_polishing: { label: "Edge Polishing", unit: "per linear meter" },
  mitering: { label: "Mitering", unit: "per linear meter" },
  delivery_cost: { label: "Delivery Fee", unit: "base rate" },
  mobilization_cost: { label: "Mobilization Fee", unit: "base rate" }
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
  const [termsId, setTermsId] = useState(null);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [contactPhone, setContactPhone] = useState("0919 585 9959");
  const [contactEmail, setContactEmail] = useState("rolkoh@yahoo.com.ph");
  const [contactFacebook, setContactFacebook] = useState("facebook.com/sixsigmaphil");
  const [contactViber, setContactViber] = useState("0919 585 9959");
  const [contactInfoId, setContactInfoId] = useState(null);
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
      
      const ratesData = {};
      const idsData = {};
      const unitsData = {};
      let vatData = 12;
      let vId = null;
      let termsText = "PAYMENT TERMS:\n- 60% of Total Contract Amount as down payment\n- 30% upon delivery\n- 10% balance upon completion of work\n\nOTHER TERMS:\n- Price quoted includes VAT\n- Warranty: 1 year on workmanship, manufacturer warranty on materials";
      let tId = null;
      let contactPhoneData = "0919 585 9959";
      let contactEmailData = "rolkoh@yahoo.com.ph";
      let contactFacebookData = "facebook.com/sixsigmaphil";
      let contactViberData = "0919 585 9959";
      let cId = null;
      
      data.forEach(item => {
        if (item.item_name === 'vat_percentage') {
          vatData = item.rate_amount;
          vId = item.id;
        } else if (item.item_name === 'terms_and_conditions') {
          // terms_and_conditions is stored in unit_type as a text blob
          termsText = item.unit_type || termsText;
          tId = item.id;
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
          cId = item.id;
        } else if (RATE_MAPPING[item.item_name]) {
          ratesData[item.item_name] = item.rate_amount;
          idsData[item.item_name] = item.id;
          unitsData[item.item_name] = item.unit_type;
        }
      });
      
      // Merge with default mapped values in case some aren't in DB yet
      Object.keys(RATE_MAPPING).forEach(key => {
        if (ratesData[key] === undefined) {
          ratesData[key] = 0;
        }
        if (!unitsData[key]) {
          unitsData[key] = 'flat'; // safe default
        }
      });
      
      setRates(ratesData);
      setRateIds(idsData);
      setUnitTypes(unitsData);
      setVat(vatData);
      setVatId(vId);
      setTermsAndConditions(termsText);
      setTermsId(tId);
      setContactPhone(contactPhoneData);
      setContactEmail(contactEmailData);
      setContactFacebook(contactFacebookData);
      setContactViber(contactViberData);
      setContactInfoId(cId);
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
      const upsertData = Object.keys(rates).map(key => {
        const payload = {
          item_name: key,
          rate_amount: parseFloat(rates[key]) || 0,
          unit_type: unitTypes[key] || 'flat'
        };
        if (rateIds[key]) {
          payload.id = rateIds[key];
        }
        return payload;
      });
      
      const { error } = await supabase.from('labor_rates').upsert(upsertData);
      if (error) throw error;
      
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

  // Save Terms & Conditions — stored in labor_rates using unit_type as text blob
  const saveTerms = async () => {
    setIsSavingTerms(true);
    try {
      const payload = {
        item_name: 'terms_and_conditions',
        rate_amount: 0,
        unit_type: termsAndConditions  // reuse unit_type column to store the text
      };
      if (termsId) payload.id = termsId;
      const { error } = await supabase.from('labor_rates').upsert([payload]);
      if (error) throw error;
      showToast('Terms & Conditions updated successfully', 'success');
      fetchSettings();
    } catch (error) {
      showToast(error.message || 'Failed to save terms', 'error');
    } finally {
      setIsSavingTerms(false);
    }
  };

  // Save Contact Information — stored in labor_rates as JSON in unit_type
  const saveContactInfo = async () => {
    setIsSavingContact(true);
    try {
      const payload = {
        item_name: 'contact_info',
        rate_amount: 0,
        unit_type: JSON.stringify({
          phone: contactPhone.trim(),
          email: contactEmail.trim(),
          facebook: contactFacebook.trim(),
          viber: contactViber.trim()
        })
      };
      if (contactInfoId) payload.id = contactInfoId;
      const { error } = await supabase.from('labor_rates').upsert([payload]);
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
            <div className="space-y-6">
              {Object.entries(RATE_MAPPING).map(([key, info]) => (
                <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#232B32] mb-1">{info.label}</label>
                    <span className="text-xs text-[#6B7280]">{info.unit}</span>
                  </div>
                  <div className="w-full md:w-48 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]">₱</span>
                    <input
                      type="number"
                      value={rates[key] ?? ''}
                      onChange={(e) => handleRateChange(key, e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-[#F9F9FB] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] text-[#232B32] transition-colors"
                      placeholder="0.00"
                      min="0"
                    />
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
                    className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[120px]"
                  >
                    {isSavingRates ? 'Saving...' : 'Yes, Save Rates'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRateConfirm(true)}
                  className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all"
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
                    className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[120px]"
                  >
                    {isSavingVat ? 'Saving...' : 'Yes, Save Tax'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowVatConfirm(true)}
                  className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all"
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
                  placeholder="e.g. rolkoh@yahoo.com.ph"
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
                className="px-6 py-2.5 bg-[#C5A059] text-white text-sm font-medium rounded-lg hover:brightness-110 transition-all disabled:opacity-50 min-w-[170px]"
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
