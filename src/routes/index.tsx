import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/login/LoginPage';
import { AdminShell } from '@/admin/AdminShell';
import { ClientsPage } from '@/admin/pages/ClientsPage';
import { UsersPage } from '@/admin/pages/UsersPage';
import { ProductsPage } from '@/admin/pages/ProductsPage';
import { QueueAttentionPage } from '@/admin/pages/QueueAttentionPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ActionsPage } from '@/features/actions/ActionsPage';
import { ManageActionsPage } from '@/features/actions/ManageActionsPage';
import { TicketsPage } from '@/features/tickets/TicketsPage';
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage';
import { PeoplePage } from '@/features/people/PeoplePage';
import { PersonDetailPage } from '@/features/people/PersonDetailPage';
import { DeviceDetailPage } from '@/features/people/DeviceDetailPage';
import { AssetsPage } from '@/features/assets/AssetsPage';
import { LicensesPage } from '@/features/licenses/LicensesPage';
import { LicenseDetailPage } from '@/features/licenses/LicenseDetailPage';
import { RoadmapsPage } from '@/features/roadmaps/RoadmapsPage';
import { QBRsPage } from '@/features/qbrs/QBRsPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { RiskPage } from '@/features/risk/RiskPage';
import { CustomerChurnPage } from '@/features/churn/CustomerChurnPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';
import { DocumentDetailPage } from '@/features/documents/DocumentDetailPage';
import { FormsPage } from '@/features/forms/FormsPage';
import { NewsPage } from '@/features/news/NewsPage';
import { NewsDetailPage } from '@/features/news/NewsDetailPage';
import { SalesOpportunitiesPage } from '@/features/sales-opportunities/SalesOpportunitiesPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'actions', element: <ActionsPage /> },
      { path: 'actions/manage', element: <ManageActionsPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
      { path: 'people', element: <PeoplePage /> },
      { path: 'people/:id', element: <PersonDetailPage /> },
      { path: 'devices/:id', element: <DeviceDetailPage /> },
      { path: 'assets', element: <AssetsPage /> },
      { path: 'licenses', element: <LicensesPage /> },
      { path: 'licenses/:id', element: <LicenseDetailPage /> },
      { path: 'roadmaps', element: <RoadmapsPage /> },
      { path: 'qbrs', element: <QBRsPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'risk', element: <RiskPage /> },
      { path: 'customer-churn', element: <CustomerChurnPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'queue-attention', element: <QueueAttentionPage /> },
      { path: 'sales-opportunities', element: <SalesOpportunitiesPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'documents/:id', element: <DocumentDetailPage /> },
      { path: 'forms', element: <FormsPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'news/:id', element: <NewsDetailPage /> },
    ],
  },
  {
    path: '/admin/login',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true, element: <Navigate to="clients" replace /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'products', element: <ProductsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
