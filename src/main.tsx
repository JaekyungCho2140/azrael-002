import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { QUERY_RETRY_COUNT } from './constants'
import './styles/index.css'
import 'frappe-gantt/dist/frappe-gantt.css'

// 개발 모드: CSV 임포트 함수 로드
if (import.meta.env.DEV) {
  import('./scripts/importFromCSVBrowser').then(() => {
    console.log('✅ CSV 임포트 함수 준비됨: window.importAllCSV()');
  });
}

// React Query 클라이언트 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: QUERY_RETRY_COUNT,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
