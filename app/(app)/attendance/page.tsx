import AttendanceContent from './components/AttendanceContent'
import { Heading } from '@/components/ui/typography'

export default function AttendancePage() {
  // Server-rendered heading lands in the initial HTML so LCP doesn't wait
  // for the 1188-line client bundle + raid-events waterfall.
  const serverHeading = (
    <div>
      <Heading level={1}>Attendance</Heading>
      <p className="text-muted-foreground mt-1 text-base">
        Track raid attendance and view attendance scores
      </p>
    </div>
  )

  return <AttendanceContent serverHeading={serverHeading} />
}
