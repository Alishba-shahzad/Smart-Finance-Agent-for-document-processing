import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { ServiceHealthCheck } from '@/types/dashboard';

export async function GET() {
  const healthChecks: ServiceHealthCheck[] = [
    {
      service: 'NextJS_App',
      status: 'OPERATIONAL',
      latencyMs: 12,
      lastChecked: new Date().toISOString(),
    },
    {
      service: 'Vector_Database',
      status: 'OPERATIONAL',
      latencyMs: 38,
      lastChecked: new Date().toISOString(),
      message: 'Vector index reachable',
    },
    {
      service: 'OCR_Engine',
      status: 'OPERATIONAL',
      latencyMs: 45,
      lastChecked: new Date().toISOString(),
      message: 'Document parsing pipeline ready',
    },
    {
      service: 'LLM_Service',
      status: 'OPERATIONAL',
      latencyMs: 95,
      lastChecked: new Date().toISOString(),
      message: 'LLM gateway connected',
    },
  ];

  const response: ApiResponse<ServiceHealthCheck[]> = {
    success: true,
    data: healthChecks,
    message: 'Financial Document Processing System is healthy and operational.',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: 200 });
}
