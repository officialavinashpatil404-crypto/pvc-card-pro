'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UserContextProps {
  plan: string;
  remaining_cards: number;
  role: string;
}

const UserContext = createContext<UserContextProps>({
  plan: 'Free',
  remaining_cards: 0,
  role: 'USER',
});

export const useUserContext = () => useContext(UserContext);

export function UserProvider({
  userId,
  initialData,
  children,
}: {
  userId: string;
  initialData: UserContextProps;
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<UserContextProps>(initialData);

  useEffect(() => {
    setUserData(initialData);
  }, [initialData]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setUserData((prev) => ({
            ...prev,
            plan: payload.new.plan || prev.plan,
            remaining_cards: payload.new.remaining_cards ?? prev.remaining_cards,
            role: payload.new.role || prev.role,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <UserContext.Provider value={userData}>
      {children}
    </UserContext.Provider>
  );
}
