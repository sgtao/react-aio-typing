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
      />
    );
    expect(screen.getByText('01_時制')).toBeInTheDocument();
    expect(screen.getByText('[003]')).toBeInTheDocument();
    expect(screen.getByText('3 / 21')).toBeInTheDocument();
  });
});
