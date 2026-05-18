import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DonutChart } from '../charts/DonutChart';

describe('DonutChart', () => {
  it('パーセントを中央に表示する', () => {
    render(<DonutChart value={142} total={418} />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('value/total テキストを表示する', () => {
    render(<DonutChart value={142} total={418} />);
    expect(screen.getByText('142/418')).toBeInTheDocument();
  });

  it('value=0 のとき 0% を表示する', () => {
    render(<DonutChart value={0} total={418} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('value=total のとき 100% を表示する', () => {
    render(<DonutChart value={418} total={418} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('total=0 のとき 0% を表示してクラッシュしない', () => {
    render(<DonutChart value={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
