import { staffAttendanceService } from '../staff-attendance/staff-attendance.service';
import { employeeRepository } from '../employees/employee.repository';
import { purchaseService } from '../purchases/purchase.service';
import { inventoryService } from '../inventory/inventory.service';
import { assetService } from '../assets/asset.service';
import { facilityRequestService } from '../facility-requests/facility-request.service';
import { AuthContext } from '../../lib/auth-context';

export interface OperationsSummary {
  staffPresent: number;
  staffLate: number;
  staffAbsent: number;
  totalStaff: number;
  pendingPurchaseRequests: number;
  lowStockItems: number;
  assetsUnderRepair: number;
  openFacilityRequests: number;
}

/** One aggregate call for the dashboard's KPI row, instead of the frontend
 *  firing off separate requests to Attendance, Purchases, Inventory, Assets
 *  and Facility Requests. */
export const operationsService = {
  async getSummary(ctx: AuthContext): Promise<OperationsSummary> {
    const [todayAttendance, totalStaff, pendingPurchaseRequests, lowStockItems, assetsUnderRepair, openFacilityRequests] = await Promise.all([
      staffAttendanceService.listToday(ctx),
      employeeRepository.countAll(ctx.schoolId),
      purchaseService.countPendingRequests(ctx),
      inventoryService.countLowStock(ctx),
      assetService.countUnderRepair(ctx),
      facilityRequestService.countOpen(ctx),
    ]);

    const staffPresent = todayAttendance.filter((r) => r.status === 'present' || r.status === 'half_day').length;
    const staffLate = todayAttendance.filter((r) => r.status === 'late').length;
    // Anyone without a punch record today reads as absent for this KPI —
    // matches how the dashboard wireframe treats "no attendance marked" state.
    const staffAbsent = Math.max(0, totalStaff - todayAttendance.length);

    return {
      staffPresent, staffLate, staffAbsent, totalStaff, pendingPurchaseRequests, lowStockItems,
      assetsUnderRepair, openFacilityRequests,
    };
  },
};
