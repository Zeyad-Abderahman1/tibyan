import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers.js';
import { router } from './router.js';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
