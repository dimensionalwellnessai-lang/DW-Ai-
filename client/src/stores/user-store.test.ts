import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '../stores/user-store';

describe('useUserStore', () => {
  beforeEach(() => {
    // Clear localStorage and reset store to initial state
    localStorage.clear();
    useUserStore.setState({
      user: null,
      isAuthenticated: false,
      isGuest: false,
    });
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useUserStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isGuest).toBe(false);
  });

  it('should set user and mark as authenticated', () => {
    const { result } = renderHook(() => useUserStore());
    
    act(() => {
      result.current.setUser({ id: 1, username: 'testuser' });
    });

    expect(result.current.user).toEqual({ id: 1, username: 'testuser' });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isGuest).toBe(false);
  });

  it('should set guest mode', () => {
    const { result } = renderHook(() => useUserStore());
    
    act(() => {
      result.current.setGuest(true);
    });

    expect(result.current.isGuest).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should logout and clear user data', () => {
    const { result } = renderHook(() => useUserStore());
    
    // First set a user
    act(() => {
      result.current.setUser({ id: 1, username: 'testuser' });
    });

    // Then logout
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isGuest).toBe(false);
  });
});
