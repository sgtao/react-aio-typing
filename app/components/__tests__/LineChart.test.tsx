import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineChart } from '../charts/LineChart';

describe('LineChart', () => {
  it('data が空のとき「データなし」を表示する', () => {
    render(<LineChart data={[]} />);
    expect(screen.getByText('データなし')).toBeInTheDocument();
  });

  it('data が1件のとき「データなし」を表示する', () => {
    render(<LineChart data={[95]} />);
    expect(screen.getByText('データなし')).toBeInTheDocument();
  });

  it('data が2件以上のとき SVG を表示する', () => {
    const { container } = render(<LineChart data={[70, 80, 90, 95]} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('polyline')).toBeInTheDocument();
  });

  it('「← 古い」「新しい →」ラベルを表示する', () => {
    render(<LineChart data={[70, 80, 90]} />);
    expect(screen.getByText('← 古い')).toBeInTheDocument();
    expect(screen.getByText('新しい →')).toBeInTheDocument();
  });
});
