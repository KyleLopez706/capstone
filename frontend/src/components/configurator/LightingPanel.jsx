import useConfiguratorStore from '../../store/configuratorStore';

export default function LightingPanel() {
  const lightingRig = useConfiguratorStore((s) => s.lightingRig);
  const setLightingRig = useConfiguratorStore((s) => s.setLightingRig);

  const options = [
    { id: 'studio', name: 'Studio Highlights', desc: 'Crisp, dramatic specular lighting to showcase polish and reflections.' },
    { id: 'daylight', name: 'Natural Daylight', desc: 'Soft, even outdoor lighting perfect for seeing true colors.' },
    { id: 'warm', name: 'Warm Evening', desc: 'Cozy, golden hour lighting with rich amber shadows.' }
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
      <div className="mb-6">
        <h3 className="text-[#F9F9FB] text-sm font-bold uppercase tracking-widest mb-2">Lighting Rig</h3>
        <p className="text-[#9CA3AF] text-xs leading-relaxed">
          Select an environment to see how your chosen materials respond to different lighting conditions. High Quality Mode must be active for full effects.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setLightingRig(opt.id)}
            className={`w-full p-4 flex flex-col text-left rounded-md transition-all duration-300 ${
              lightingRig === opt.id
                ? 'border border-[#C5A059] bg-[#C5A059]/10 shadow-[0_0_15px_rgba(197,160,89,0.15)]'
                : 'border border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            <span className={`text-xs font-bold tracking-widest uppercase mb-1.5 transition-colors ${lightingRig === opt.id ? 'text-[#C5A059]' : 'text-[#F9F9FB]'}`}>
              {opt.name}
            </span>
            <span className="text-[#9CA3AF] text-xs leading-relaxed">
              {opt.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
