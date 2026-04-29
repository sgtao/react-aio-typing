import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('カテゴリ・インデックス・位置を表示する', () => {
    render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={false}
      />
    );
    expect(screen.getByText('01_時制')).toBeInTheDocument();
    expect(screen.getByText('[003]')).toBeInTheDocument();
    expect(screen.getByText('3 / 21')).toBeInTheDocument();
  });

  it('leftFlash=true のとき section-header--flash クラスを付与する', () => {
    const { container } = render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={true}
      />
    );
    expect(container.firstChild).toHaveClass('section-header--flash');
  });

  it('leftFlash=false のとき section-header--flash クラスを付与しない', () => {
    const { container } = render(
      <SectionHeader
        category="01_時制"
        currentIndex="[003]"
        sectionPosition={3}
        sectionTotal={21}
        leftFlash={false}
      />
    );
    expect(container.firstChild).not.toHaveClass('section-header--flash');
  });
});
