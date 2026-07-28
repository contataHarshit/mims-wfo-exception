import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import(
        "../components/create-request/create-request.component"
      ).then(
        (m) => m.CreateRequestComponent
      ),
    pathMatch: "full",
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("../components/employee-dashboard/employee-dashboard.component").then(
        (m) => m.EmployeeDashboardComponent
      ),
  },
  {
    path: "od-dashboard",
    loadComponent: () =>
      import("../components/employee-dashboard/employee-dashboard.component").then(
        (m) => m.EmployeeDashboardComponent
      ),
  },
  {
    path: "create-request", // ✅ keep same folder spelling
    loadComponent: () =>
      import(
        "../components/create-request/create-request.component"
      ).then(
        (m) => m.CreateRequestComponent
      ),
  },
  {
    path: "hr-admin-dashboard",
    loadComponent: () =>
      import(
        "../components/hr-admin-dashboard/hr-admin-dashboard.component"
      ).then((m) => m.HrAdminDashboardComponent),
  },
  {
    path: "attendance-dashboard",
    loadComponent: () =>
      import(
        "../components/attendance-dashboard/attendance-dashboard.component"
      ).then((m) => m.CsvUploadComponent),
  },
  {
    path: "correction-dashboard",
    loadComponent: () =>
      import(
        "../components/correction-dashboard/correction-dashboard.component"
      ).then((m) => m.CorrectionDashboardComponent),
  },
  {
    path: "add-manual-attendance",
    loadComponent: () =>
      import(
        "../components/add-manual-attendance/add-manual-attendance.component"
      ).then((m) => m.AddManualAttendanceComponent),
  },
  {
    path: "on-duty-request",
    loadComponent: () =>
      import(
        "../components/create-request/create-request.component"
      ).then((m) => m.CreateRequestComponent),
  }
];
