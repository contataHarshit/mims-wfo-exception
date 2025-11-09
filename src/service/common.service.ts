import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject, Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CommonService {
  header: string = "WFH Request";

  // BehaviorSubjects hold latest values and auto emit to new subscribers
  private employeeIdSubject = new BehaviorSubject<string>("");
  private employeeNameSubject = new BehaviorSubject<string>("User");
  private employeeNumberSubject = new BehaviorSubject<string>("");
  private employeeEmailSubject = new BehaviorSubject<string>("");
  private projectNameSubject = new BehaviorSubject<string>("");
  private projectManagerSubject = new BehaviorSubject<string>("");

  // Public observables for subscription
  employeeId$ = this.employeeIdSubject.asObservable();
  employeeName$ = this.employeeNameSubject.asObservable();
  employeeNumber$ = this.employeeNumberSubject.asObservable();
  employeeEmail$ = this.employeeEmailSubject.asObservable();
  projectName$ = this.projectNameSubject.asObservable();
  projectManager$ = this.projectManagerSubject.asObservable();

  // View handling
  currentView = "self";
  viewChange$ = new BehaviorSubject<string>("self");

  // Other properties
  loading = false;
  managerEmployeeData: any[] = [];
  userDataLoaded$ = new Subject<void>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /** ✅ Update employee data after fetching from API */
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  setLoading(value: boolean) {
    this.loadingSubject.next(value);
  }
  setEmployeeData(employee: any) {
    this.employeeIdSubject.next(employee?.employeeId || "");
    this.employeeNameSubject.next(employee?.employeeName || "User");
    this.employeeNumberSubject.next(employee?.employeeNumber || "");
    this.employeeEmailSubject.next(employee?.email || "");
    this.projectNameSubject.next(employee?.projectName || "");
    this.projectManagerSubject.next(employee?.managerName?.name || "");
    this.employeeNumberSubject.next(employee?.employeeNumber || "");
  }

  /** ✅ Update current view reactively */
  viewChange(event: any) {
    const view = event.target.value === "self" ? "self" : "resource";
    this.currentView = view;
    this.viewChange$.next(view);
  }

  /** ✅ Getters for instant access if needed */
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
  get projectName() {
    return this.projectNameSubject.value;
  }
  get projectManager() {
    return this.projectManagerSubject.value;
  }
  private managerListSubject = new BehaviorSubject<any[]>([
    { label: "All", value: "" },
  ]);
  managerList$ = this.managerListSubject.asObservable();

  /** Update manager list */
  setManagerList(list: { EmployeeNumber: string; FullName: string }[]) {
    const formattedList = [
      { label: "All", value: "" },
      ...list.map((m) => ({
        label: `${m.FullName} (${m.EmployeeNumber})`,
        value: m.EmployeeNumber,
      })),
    ];
    this.managerListSubject.next(formattedList);
  }

  /** Optional: get current value */
  get managerList() {
    return this.managerListSubject.value;
  }
}
