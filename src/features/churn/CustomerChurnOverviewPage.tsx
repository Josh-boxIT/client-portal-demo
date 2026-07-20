import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { useTenantStore } from '@/theme/tenantStore';
import {
  formatAssessmentDate,
  getAccessibleChurnRows,
  getRiskTone,
} from './churnData';

export function CustomerChurnOverviewPage() {
  const { identity, accessibleClientIds } = useAuthStore();
  const { switchTenant } = useSessionStore();
  const { tenants } = useTenantStore();

  const rows = getAccessibleChurnRows(identity, accessibleClientIds, tenants);

  return (
    <div>
      <PageHeader
        title="Customer Churn"
        subtitle="AI-assisted retention risk across the customers you can access"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Customer</TableHead>
                <TableHead className="min-w-[140px]">Churn risk</TableHead>
                <TableHead className="whitespace-nowrap text-right">Account age</TableHead>
                <TableHead className="whitespace-nowrap text-right">Credit usage</TableHead>
                <TableHead className="whitespace-nowrap text-right">Days past due</TableHead>
                <TableHead className="whitespace-nowrap text-right">On-time payments</TableHead>
                <TableHead className="whitespace-nowrap text-right">Open cases</TableHead>
                <TableHead className="whitespace-nowrap text-right">Closed cases</TableHead>
                <TableHead className="whitespace-nowrap text-right">Repeat cases</TableHead>
                <TableHead className="min-w-[130px] whitespace-nowrap">Assessed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                    No churn assessments are available for your customers.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ customer, assessment }) => {
                  const tone = getRiskTone(assessment.score);
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        {customer.vertical && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{customer.vertical}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-semibold ${tone.scoreClass}`}>
                            {assessment.score}
                          </span>
                          <Badge className={tone.badgeClass} variant="outline">
                            {tone.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{assessment.accountAgeYears} yrs</TableCell>
                      <TableCell className="text-right">{assessment.creditLimitUsagePercent}%</TableCell>
                      <TableCell className="text-right">{assessment.daysPastDue}</TableCell>
                      <TableCell className="text-right">{assessment.onTimePaymentRatio}%</TableCell>
                      <TableCell className="text-right">{assessment.openCases}</TableCell>
                      <TableCell className="text-right">{assessment.closedCases}</TableCell>
                      <TableCell className="text-right">{assessment.repeatCases}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatAssessmentDate(assessment.assessedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to={`/customer-churn/${encodeURIComponent(customer.id)}`}
                            onClick={() => switchTenant(customer.id)}
                            aria-label={`View churn assessment for ${customer.name}`}
                          >
                            View
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
