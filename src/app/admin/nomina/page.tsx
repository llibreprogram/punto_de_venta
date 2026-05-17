'use client'
import AdminLayout from '@/components/AdminLayout'
import NominaDashboard from '@/components/nomina/NominaDashboard'

export default function NominaPage() {
  return (
    <AdminLayout title="💰 Nómina de Empleados">
      <NominaDashboard />
    </AdminLayout>
  )
}
