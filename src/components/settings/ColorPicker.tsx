import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCENT_COLORS } from '../../lib/constants';
import { useSettingsStore } from '../../stores/settingsStore';

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface ColorSwatches {
  readonly name: string;
  readonly value: string;
}

interface ColorPickerProps {
  value?: string;
  onChange?: (color: string) => Promise<void> | void;
  swatches?: readonly ColorSwatches[];
  inputId?: string;
}

export default function ColorPicker({
  value,
  onChange,
  swatches = ACCENT_COLORS,
  inputId = 'custom-accent-color',
}: ColorPickerProps) {
  const { t } = useTranslation();
  const storeAccent = useSettingsStore((state) => state.accentColor);
  const updateAccentColor = useSettingsStore((state) => state.updateAccentColor);

  const activeColor = value ?? storeAccent;
  const handleSelect = onChange ?? updateAccentColor;

  const [customColor, setCustomColor] = useState(activeColor);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setCustomColor(activeColor);
  }, [activeColor]);

  const applyCustom = () => {
    if (!HEX_RE.test(customColor)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void handleSelect(customColor);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {swatches.map((color) => {
          const selected = activeColor.toLowerCase() === color.value.toLowerCase();
          const isLightSwatch = color.value.toLowerCase() === '#f8fafc';
          return (
            <button
              key={color.value}
              type="button"
              aria-label={t(color.name)}
              title={t(color.name)}
              aria-pressed={selected}
              onClick={() => {
                setCustomColor(color.value);
                setInvalid(false);
                void handleSelect(color.value);
              }}
              className="grid h-8 w-8 place-items-center rounded-full border border-black/10 transition hover:scale-110 dark:border-white/15"
              style={{
                background: color.value,
                outline: selected ? `2px solid ${color.value}` : '2px solid transparent',
                outlineOffset: 3,
              }}
            >
              {selected && (
                <span className={`text-sm font-bold ${isLightSwatch ? 'text-slate-900' : 'text-white'}`}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={inputId}>
          {t('settings.accentColor')}
        </label>
        <input
          id={inputId}
          value={customColor}
          onChange={(event) => {
            setCustomColor(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyCustom();
          }}
          className="min-w-0 flex-1 rounded-xl border bg-transparent px-3 py-2 text-xs uppercase surface-border"
          placeholder="#3B82F6"
          aria-invalid={invalid}
        />
        <button
          type="button"
          onClick={applyCustom}
          className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          {t('common.apply', { defaultValue: 'Aplicar' })}
        </button>
      </div>
      {invalid && (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {t('common.invalidColor', { defaultValue: 'Informe uma cor hexadecimal válida.' })}
        </p>
      )}
    </div>
  );
}
