// FILE: common.service.ts - FIXED VERSION
import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject } from "rxjs";
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { ConstantService } from "./constant.service";
import { HttpService } from "./http.service";
@Injectable({
  providedIn: "root",
})
export class CommonService {
  header: string = "WFH Request";
  public config: any;
  private configLoaded = false; // Track if config is already loaded

  // ============================================
  // Employee Data BehaviorSubjects
  // ============================================
  private employeeIdSubject = new BehaviorSubject<string>("");
  private employeeNameSubject = new BehaviorSubject<string>("");
  private employeeNumberSubject = new BehaviorSubject<string>("");
  private employeeEmailSubject = new BehaviorSubject<string>("");
  private departmentSubject = new BehaviorSubject<string>("");
  private projectNameSubject = new BehaviorSubject<string>("");
  private projectManagerSubject = new BehaviorSubject<string>("");
  private roleSubject = new BehaviorSubject<string>("");

  // Public observables for subscription
  employeeId$ = this.employeeIdSubject.asObservable();
  employeeName$ = this.employeeNameSubject.asObservable();
  employeeNumber$ = this.employeeNumberSubject.asObservable();
  employeeEmail$ = this.employeeEmailSubject.asObservable();
  department$ = this.departmentSubject.asObservable();
  projectName$ = this.projectNameSubject.asObservable();
  projectManager$ = this.projectManagerSubject.asObservable();
  role$ = this.roleSubject.asObservable();
  attendanceView = "upload";
  // ============================================
  // View Handling
  // ============================================
  viewChange$ = new BehaviorSubject<string>("self");
  attendanceViewChange$ = new BehaviorSubject<string>("upload");
  // ============================================
  // Data Loading Status
  // ============================================
  userDataLoaded$ = new BehaviorSubject<boolean>(false);

  // ============================================
  // Loading State
  // ============================================
  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();

  // ============================================
  // Manager List
  // ============================================
  private managerListSubject = new BehaviorSubject<any[]>([]);
  managerList$ = this.managerListSubject.asObservable();

  // ============================================
  // All Employee Data (for HR/ADMIN)
  // ============================================
  private allEmployeeDataSubject = new BehaviorSubject<any[]>([]);
  allEmployeeData$ = this.allEmployeeDataSubject.asObservable();

  // ============================================
  // Manager Employee Data (for MANAGER)
  // ============================================
  private managerEmployeeDataSubject = new BehaviorSubject<any[]>([]);
  managerEmployeeData$ = this.managerEmployeeDataSubject.asObservable();
  selectedView = "self";
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private httpService: HttpService,
    private constants: ConstantService
  ) {}

  // ============================================
  // LOADING STATE METHODS
  // ============================================

  /** Set loading state */
  setLoading(value: boolean) {
    // Only log in development
    if (!value || this.loadingSubject.value !== value) {
      this.loadingSubject.next(value);
    }
  }

  /** Get loading state */
  get loading() {
    return this.loadingSubject.value;
  }

  // ============================================
  // EMPLOYEE DATA METHODS
  // ============================================

  /** Update employee data after fetching from API */
  setEmployeeData(employee: any) {
    const empId =
      employee?.employeeId ?? employee?.EmployeeId ?? employee?.id ?? "";
    const empName =
      employee?.employeeName ??
      employee?.EmployeeName ??
      employee?.FullName ??
      "";
    const empNumber =
      employee?.employeeNumber ??
      employee?.EmployeeNumber ??
      employee?.EmployeeNo ??
      employee?.Employee_Id ??
      "";
    const empEmail =
      employee?.email ?? employee?.Email ?? employee?.employeeEmail ?? "";
    const empDept = employee?.department ?? employee?.Department ?? "";
    const projName = employee?.projectName ?? employee?.ProjectName ?? "";
    const projManager =
      employee?.projectManager ??
      employee?.projectManagerName ??
      employee?.managerName?.name ??
      employee?.Manager ??
      "";

    this.employeeIdSubject.next(empId || "");
    this.employeeNameSubject.next(empName || "");
    this.employeeNumberSubject.next(empNumber || "");
    this.employeeEmailSubject.next(empEmail || "");
    this.departmentSubject.next(empDept || "");
    this.projectNameSubject.next(projName || "");
    this.projectManagerSubject.next(projManager || "");
  }

  /** Set role */
  setRole(role: string) {
    if (this.roleSubject.value !== role) {
      this.roleSubject.next(role);
    }
  }

  /** Getters for instant access to current values */
  get employeeId() {
    return this.employeeIdSubject.value;
  }

  get employeeName() {
    return this.employeeNameSubject.value;
  }

  get employeeNumber() {
    return this.employeeNumberSubject.value;
  }

  get employeeEmail() {
    return this.employeeEmailSubject.value;
  }

  get department() {
    return this.departmentSubject.value;
  }

  get projectName() {
    return this.projectNameSubject.value;
  }

  get projectManager() {
    return this.projectManagerSubject.value;
  }

  get role() {
    return this.roleSubject.value;
  }

  // ============================================
  // ROLE-SPECIFIC DATA METHODS
  // ============================================

  /** Set all employee data (for HR/ADMIN) */
  setAllEmployeeData(data: any[]) {
    if (
      JSON.stringify(this.allEmployeeDataSubject.value) !== JSON.stringify(data)
    ) {
      this.allEmployeeDataSubject.next(data || []);
    }
  }

  /** Get all employee data */
  get allEmployeeData() {
    return this.allEmployeeDataSubject.value;
  }

  /** Set manager employee data (for MANAGER) */
  setManagerEmployeeData(data: any[]) {
    if (
      JSON.stringify(this.managerEmployeeDataSubject.value) !==
      JSON.stringify(data)
    ) {
      this.managerEmployeeDataSubject.next(data || []);
    }
  }

  /** Get manager employee data */
  get managerEmployeeData() {
    return this.managerEmployeeDataSubject.value;
  }

  // ============================================
  // MANAGER LIST METHODS
  // ============================================

  /** Update manager list */
  setManagerList(list: { EmployeeNumber: string; FullName: string }[]) {
    const formattedList = list.map((m) => ({
      label: `${m.FullName} (${m.EmployeeNumber})`,
      value: m.EmployeeNumber,
    }));

    if (
      JSON.stringify(this.managerListSubject.value) !==
      JSON.stringify(formattedList)
    ) {
      this.managerListSubject.next(formattedList);
    }
  }

  /** Get manager list */
  get managerList() {
    return this.managerListSubject.value;
  }

  // ============================================
  // VIEW CHANGE METHOD
  // ============================================

  /** Update current view */
  viewChange(event: any) {
    const view = event.target?.value || event;
    this.viewChange$.next(view);
  }
  attendanceViewChange(event: any) {
    const view = event.target?.value || event;
    this.attendanceViewChange$.next(view);
  }
  // ============================================
  // USER DATA LOADED METHOD
  // ============================================

  /** Mark user data as loaded */
  setUserDataLoaded(loaded: boolean = true) {
    if (this.userDataLoaded$.value !== loaded) {
      this.userDataLoaded$.next(loaded);
    }
  }

  // ============================================
  // CONFIG LOADING METHOD
  // ============================================

  /** Load config file only once */
  async loadConfig() {
    if (this.configLoaded && this.config) {
      return this.config;
    }

    try {
      this.config = await firstValueFrom(
        this.http.get("/assets/config/config.json")
      );
      this.configLoaded = true;
      return this.config;
    } catch (error) {
      console.error("Error loading config:", error);
      this.configLoaded = false;
      throw error;
    }
  }
  downloadCSV(data: any[]) {
    if (!data || data.length === 0) {
      return;
    }

    const csvRows: string[] = [];

    const removedKeys = ["id", "Id", "_id", "employeeId"];

    const headers = Object.keys(data[0]).filter(
      (h) => !removedKeys.includes(h)
    );

    csvRows.push(headers.join(","));

    data.forEach((item) => {
      const values = headers.map((h) => {
        let val = item[h] ?? "";
        if (typeof val === "string") {
          val = val.replace(/,/g, " ");
          val = `"${val}"`;
        }
        return val;
      });
      csvRows.push(values.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `exception_requests_${new Date().getTime()}.csv`;
    a.click();
  }
  sendWeeklyMail(): void {
    this.triggerNonComplianceMail("WEEK");
  }

  sendMonthlyMail(): void {
    this.triggerNonComplianceMail("MONTH");
  }
  private toStartOfDayISO(date: Date): string {
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  private toEndOfDayISO(date: Date): string {
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }
  private getDateRange(type: "WEEK" | "MONTH"): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();

    if (type === "WEEK") {
      const day = today.getDay(); // 0 = Sun, 1 = Mon
      const diffToMonday = day === 0 ? 6 : day - 1;

      const start = new Date(today);
      start.setDate(today.getDate() - diffToMonday - 7);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      return {
        startDate: this.toStartOfDayISO(start),
        endDate: this.toEndOfDayISO(end),
      };
    }

    // MONTH
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    return {
      startDate: this.toStartOfDayISO(start),
      endDate: this.toEndOfDayISO(end),
    };
  }
  private triggerNonComplianceMail(type: "WEEK" | "MONTH"): void {
    this.setLoading(true);
    const { startDate, endDate } = this.getDateRange(type);

    const payload = {
      type,
      startDate,
      endDate,
    };

    this.httpService.postData(payload, this.constants.sendMail).subscribe({
      next: (res: any) => {
        console.log(`${type} non-compliance mail triggered`, res);
      },
      error: (err) => {
        this.setLoading(false);
        console.error(`${type} mail failed`, err);
      },
      complete: () => this.setLoading(false),
    });
  }
}
