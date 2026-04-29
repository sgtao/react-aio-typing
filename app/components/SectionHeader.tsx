interface Props {
  category: string;
  currentIndex: string;
  sectionPosition: number;
  sectionTotal: number;
  leftFlash: boolean;
}

export function SectionHeader({ category, currentIndex, sectionPosition, sectionTotal, leftFlash }: Props) {
  return (
    <div className={`section-header${leftFlash ? ' section-header--flash' : ''}`}>
      <span className="section-category">{category}</span>
      <span className="section-index">{currentIndex}</span>
      <span className="section-position">{sectionPosition} / {sectionTotal}</span>
    </div>
  );
}
