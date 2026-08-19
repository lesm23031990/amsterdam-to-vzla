'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OffersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/products?tab=offers');
  }, [router]);

  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <p>Redirigiendo a ofertas...</p>
    </div>
  );
}
