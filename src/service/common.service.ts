import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CommonService {
  header: string = "WFH Request";

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

  // ============================================
  // View Handling
  // ============================================
  // currentView: "self" | "resource" | "all" = "self";
  viewChange$ = new BehaviorSubject<string>("self");

  // ============================================
  // Data Loading Status
  // ============================================
  userDataLoaded$ = new BehaviorSubject<boolean>(false);

  // ============================================
  // Loading State
  // ============================================
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  // ============================================
  // Manager List
  // ============================================
  private managerListSubject = new BehaviorSubject<any[]>([
   
  ]);
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  // ============================================
  // LOADING STATE METHODS
  // ============================================

  /** Set loading state */
  setLoading(value: boolean) {
    // Debug: log loading toggles to help trace stuck loader issues
    try {
      const stack = new Error().stack
        ?.split("\n")
        .slice(2, 6)
        .map((s) => s.trim());
      // Keep logs concise
      console.log(`CommonService.setLoading -> ${value}`, stack);
    } catch (e) {
      // ignore logging errors
    }
    this.loadingSubject.next(value);
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
    console.log("emppppppp", employee);

    // Accept multiple possible API field namings (camelCase or PascalCase) to be resilient
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
    this.roleSubject.next(role);
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
    this.allEmployeeDataSubject.next(data || []);
  }

  /** Get all employee data */
  get allEmployeeData() {
    return this.allEmployeeDataSubject.value;
  }

  /** Set manager employee data (for MANAGER) */
  setManagerEmployeeData(data: any[]) {
    this.managerEmployeeDataSubject.next(data || []);
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
  this.managerListSubject.next(formattedList);
}

  /** Get manager list */
  get managerList() {
    return this.managerListSubject.value;
  }

  // ============================================
  // VIEW CHANGE METHOD
  // ============================================

  /** Update current view (deprecated - use direct assignment instead) */
  viewChange(event: any) {
    const view = event.target?.value || event;
    // this.currentView = view;
    this.viewChange$.next(view);
  }

  // ============================================
  // USER DATA LOADED METHOD
  // ============================================

  /** Mark user data as loaded */
  setUserDataLoaded(loaded: boolean = true) {
    this.userDataLoaded$.next(loaded);
  }
}
