import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';

const items = [
  { label: 'Unit 1', value: 16, total: 20 },
  { label: 'Unit 2', value: 3, total: 20 },
  { label: 'Unit 3', value: 0, total: 20 },
];

describe('HorizontalBarChart', () => {
  it('各ラベルを表示する', () => {
    render(<HorizontalBarChart items={items} />);
    expect(screen.getByText('Unit 1')).toBeInTheDocument();
    expect(screen.getByText('Unit 2')).toBeInTheDocument();
    expect(screen.getByText('Unit 3')).toBeInTheDocument();
  });

  it('各パーセントを表示する', () => {
    render(<HorizontalBarChart items={items} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('items が空のときクラッシュしない', () => {
    render(<HorizontalBarChart items={[]} />);
    // no error
  });

  it('6件以上渡したとき5件しか表示しない', () => {
    const manyItems = [
      { label: 'A', value: 1, total: 10 },
      { label: 'B', value: 2, total: 10 },
      { label: 'C', value: 3, total: 10 },
      { label: 'D', value: 4, total: 10 },
      { label: 'E', value: 5, total: 10 },
      { label: 'F', value: 6, total: 10 },
    ];
    render(<HorizontalBarChart items={manyItems} />);
    expect(screen.queryByText('F')).not.toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });
});
