// app/components/__tests__/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from '../ProtectedRoute';

vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('loading 中はスピナーを表示し、children を表示しない', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('未認証かつ loading=false の場合、/ への Navigate を返す', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/');
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('認証済みの場合、children を表示する', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user-123' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });
    render(<ProtectedRoute><div>child content</div></ProtectedRoute>);
    expect(screen.getByText('child content')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });
});
