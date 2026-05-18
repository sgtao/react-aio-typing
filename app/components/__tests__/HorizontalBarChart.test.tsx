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
});
