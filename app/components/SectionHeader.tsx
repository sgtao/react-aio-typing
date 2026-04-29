interface Props {
  category: string;
  currentIndex: string;
  sectionPosition: number;
  sectionTotal: number;
}

export function SectionHeader({ category, currentIndex, sectionPosition, sectionTotal }: Props) {
  return (
    <div className="section-header">
      <span className="section-category">{category}</span>
      <span className="section-index">{currentIndex}</span>
      <span className="section-position">{sectionPosition} / {sectionTotal}</span>
    </div>
  );
}
