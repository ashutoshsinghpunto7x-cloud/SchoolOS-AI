interface Props {
  active: boolean;
  onToggle: (on: boolean) => void;
}

/** Small pill, bottom-left above the mobile dock, to switch the winter look on/off. */
export function WinterToggle({ active, onToggle }: Props) {
  return (
    <button
      type="button"
      className="tw-ambient-toggle"
      onClick={() => onToggle(!active)}
      aria-pressed={active}
    >
      {active ? '❄ Winter on' : '❄ Turn on winter'}
    </button>
  );
}
