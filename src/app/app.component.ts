import {
  Component,
  DoCheck,
  OnInit,
  Inject,
  PLATFORM_ID,
  OnDestroy,
} from "@angular/core";
import {
  Router,
  RouterOutlet,
  ActivatedRoute,
  NavigationEnd,
} from "@angular/router";
import { HeaderComponent } from "../components/header/header.component";
import { CommonService } from "../service/common.service";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { HttpService } from "../service/http.service";
import { ConstantService } from "../service/constant.service";
import { HttpClientModule } from "@angular/common/http";
import { CommonLoaderComponent } from "../common/common-loader/common-loader.component";
import { filter, firstValueFrom, Subject, takeUntil } from "rxjs";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule,
    HttpClientModule,
    FormsModule,
    CommonLoaderComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements DoCheck, OnInit, OnDestroy {
  title = "Mims-exception-wfo";

  // Initialize with empty array - will be populated based on role
  tabs: Array<{ label: string; path: string; isActive: boolean }> = [];
  dashboardMode: "wfh" | "od" = "wfh";
  dashboardModeReady = false;

  // Flag to control tab visibility
  showTabs = false;

  token: string | null = null;
  role = "";
  isDashboardPage = false;
  isOdDashboardPage = false;
  selectedView: "all" | "self" | "resource" | "downline" = "self";
  viewOptions = [
    {
      label: "Self",
      value: "self",
    },
    {
      label: "Resource",
      value: "resource",
    },
    {
      label: "Downline",
      value: "downline",
    },
  ];
  employeeNumber: string = "";
  pageLoading: boolean = true;
  department: string = "";
  isAttendanceDashboardPage = false;
  attendanceViewOptions = [
    {
      label: "Add",
      value: "add",
    },
    {
      label: "Upload",
      value: "upload",
    },
    {
      label: "View",
      value: "view",
    },
  ];
  private destroy$ = new Subject<void>();
  isAuthenticating = true;
  private hasLoadedData = false;
  isRequestPage: boolean = false;

  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.dashboardMode = "wfh";
  }

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.dashboardMode = "wfh";
    this.dashboardModeReady = true;

    this.commonService.loadConfig().finally(() => {});
    // View selection is intentionally not persisted between page loads.
    localStorage.removeItem("selectedView");
    localStorage.removeItem("dashboardMode");

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        const url = navEnd.urlAfterRedirects;
        console.log("url---------->", url);

        this.isDashboardPage =
          url.split("?")[0].split("-")[0].includes("dashboard") ||
          url.split("?")[0].split("-")[0].includes("od");
        this.isOdDashboardPage = url.split("?")[0].includes("od-dashboard");
        this.isAttendanceDashboardPage = url
          .split("?")[0]
          .split("-")[0]
          .includes("attendance");
        const currentPath = url.split("?")[0].replace(/^\/+/, "");
        this.isRequestPage = ["", "create-request", "on-duty-request"].includes(
          currentPath,
        );
        this.syncDashboardModeWithUrl(url);
        if (this.isRequestPage) {
          this.setView("self");
        } else if (["dashboard", "od-dashboard"].includes(currentPath)) {
          const defaultView = this.role === "ADMIN" ? "all" : "self";
          this.commonService.selectedView = defaultView;
          this.commonService.viewChange$.next(defaultView);
          this.setDefaultViewByRole(this.role);
          if (this.role !== "ADMIN") {
            this.commonService.selectedView = "self";
            this.commonService.viewChange$.next("self");
          }
        }
        this.updateActiveTabs(url);
        this.addAllOptionForOD();
      });

    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("sessionid") || urlParams.get("sessionId");

    if (
      !localStorage.getItem("sessionid") ||
      sessionId !== localStorage.getItem("sessionid")
    ) {
      localStorage.setItem("sessionid", sessionId || "");
      localStorage.removeItem("token");
    }

    this.token = localStorage.getItem("token") || null;

    if (sessionId && !this.token) {
      // New session - authenticate first
      this.authenticateWithSession(sessionId);
    } else {
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");

      if (storedToken && storedRole && !this.hasLoadedData) {
        // Existing session - initialize tabs immediately
        this.token = storedToken;
        this.role = storedRole.trim().toUpperCase();
        this.employeeNumber = localStorage.getItem("employeeNumber") || "";
        this.department = localStorage.getItem("department") || "";

        // Initialize tabs based on stored role/department
        this.initializeTabs(this.role, this.department);
        this.addAllOptionForOD();
        this.showTabs = true;

        this.router.navigate([this.role === "ADMIN" ? "dashboard" : ""], {
          queryParams: this.getQueryParamsFromUrl(),
        });

        this.commonService.setRole(this.role);
        this.setDefaultViewByRole(this.role);
        this.commonService.viewChange$.next(this.commonService.selectedView);
        this.commonService.setLoading(false);
        this.hasLoadedData = true;
        this.isAuthenticating = false;
        this.loadRoleSpecificData(this.role).finally(() => {});
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize tabs based on user role and department
   * This ensures tabs are shown immediately without layout shift
   */
  private initializeTabs(role: string, department: string) {
    this.tabs = [];

    // Show only the request and dashboard tabs for the selected workflow.
    if (role !== "ADMIN" && this.dashboardMode === "wfh") {
      this.tabs.push({
        label: "Create WFH Request",
        path: "",
        isActive: false,
      });
    } else if (role !== "ADMIN") {
      this.tabs.push({
        label: "Create OD Request",
        path: "on-duty-request",
        isActive: false,
      });
    }

    this.tabs.push({
      label: this.dashboardMode === "wfh" ? "WFH Dashboard" : "OD Dashboard",
      path: this.dashboardMode === "wfh" ? "dashboard" : "od-dashboard",
      isActive: false,
    });

    // HR Admin Dashboard for HR department or ADMIN role in both workflows
    if (department === "HR" || role === "ADMIN") {
      this.tabs.push({
        label: "HR Admin Dashboard",
        path: "hr-admin-dashboard",
        isActive: false,
      });
      if (
        this.dashboardMode === "wfh" &&
        ((role === "MANAGER" && department === "HR") || role === "ADMIN")
      ) {
        this.tabs.push({
          label: "Correction Dashboard",
          path: "correction-dashboard",
          isActive: false,
        });
      }
    }

    // Attendance Dashboard is available only in the WFH workflow.
    if (
      this.dashboardMode === "wfh" &&
      ((department === "ACCOUNTS" && role === "EMPLOYEE") || role === "ADMIN")
    ) {
      this.tabs.push({
        label: "Attendance Dashboard",
        path: "attendance-dashboard",
        isActive: false,
      });
    }

    this.updateActiveTabs(this.router.url);
  }

  private authenticateWithSession(sessionId: string) {
    this.isAuthenticating = true;
    this.showTabs = false; // Hide tabs during authentication

    firstValueFrom(
      this.http.auth(this.constants.auth, { sessionid: sessionId }),
    )
      .then((response: any) => {
        const employee = response?.data?.employee || {};
        this.token = response?.data?.token || null;
        this.role = (employee.role || "").trim().toUpperCase();
        this.employeeNumber = employee.employeeNumber || "";
        this.department = employee.department || "";

        localStorage.setItem("token", this.token || "");
        localStorage.setItem("role", this.role);
        localStorage.setItem("department", this.department);
        localStorage.setItem("employeeNumber", this.employeeNumber);

        // Initialize tabs immediately after authentication
        this.initializeTabs(this.role, this.department);
        this.addAllOptionForOD();
        this.showTabs = true; // Show tabs now that they're properly initialized

        this.commonService.setRole(this.role);

        if (this.role === "ADMIN") {
          this.router.navigate(["/dashboard"], {
            queryParams: this.getQueryParamsFromUrl(),
          });
        } else {
          this.router.navigate([""], {
            queryParams: this.getQueryParamsFromUrl(),
          });
        }

        this.setDefaultViewByRole(this.role);

        this.commonService.viewChange$.next(this.commonService.selectedView);

        this.hasLoadedData = true;
        this.isAuthenticating = false;
        return this.loadRoleSpecificData(this.role);
      })
      .catch((err) => {
        this.isAuthenticating = false;
        this.showTabs = false;
      });
  }

  setDefaultViewByRole(role: string) {
    const defaultView = role === "ADMIN" ? "all" : "self";

    this.viewOptions = [
      { label: "Self", value: "self" },
      { label: "Resource", value: "resource" },
      { label: "Downline", value: "downline" },
    ];

    if (role === "ADMIN") {
      this.viewOptions = [
        { label: "All", value: "all" },
        { label: "Downline", value: "downline" },
      ];
      this.commonService.selectedView = "all";
      return;
    }

    if (this.department === "HR") {
      this.addAllOption();
      if (role === "EMPLOYEE") {
        this.viewOptions = this.viewOptions.filter(
          (o) => o.value !== "resource",
        );
      }
      this.commonService.selectedView = "self";
      return;
    }

    if (role === "MANAGER") {
      this.commonService.selectedView = "self";
      return;
    }

    if (role === "EMPLOYEE") {
      this.viewOptions = this.viewOptions.filter((o) => o.value === "self");
      this.commonService.selectedView = "self";
      return;
    }

    this.commonService.selectedView = defaultView;
    this.commonService.viewChange$.next(defaultView);
  }

  addAllOptionForOD() {
    const defaultView = this.role === "ADMIN" ? "all" : "self";

    if (this.role === "ADMIN") {
      this.viewOptions = [
        { label: "All", value: "all" },
        { label: "Downline", value: "downline" },
      ];
      if (
        !this.viewOptions.some(
          (option) => option.value === this.commonService.selectedView,
        )
      ) {
        this.commonService.selectedView = "all";
      }
      return;
    }

    this.viewOptions = [
      { label: "Self", value: "self" },
      { label: "Resource", value: "resource" },
      { label: "Downline", value: "downline" },
    ];

    const isODDashboard = this.router.url.includes("od-dashboard");

    if (isODDashboard) {
      // ===== OD Dashboard Rules =====
      if (
        this.role === "ADMIN" ||
        this.department === "HR" ||
        (this.role === "MANAGER" && this.department === "RMG")
      ) {
        this.addAllOption();
      }
    } else {
      // ===== WFH Dashboard Rules =====
      if (this.role === "ADMIN" || this.department === "HR") {
        this.addAllOption();
      }
    }
    if (this.role === "EMPLOYEE") {
      this.viewOptions = this.viewOptions.filter((o) => o.value !== "resource");
    }

    const selectedView = this.commonService.selectedView;
    const allowedView = this.viewOptions.some(
      (option) => option.value === selectedView,
    );

    if (!allowedView || selectedView === "all") {
      this.commonService.selectedView = defaultView;
      this.commonService.viewChange$.next(defaultView);
    }
  }
  private addAllOption() {
    if (!this.viewOptions.some((o) => o.value === "all")) {
      this.viewOptions.unshift({ label: "All", value: "all" });
    }
  }

  async loadRoleSpecificData(role: string) {
    if (this.hasLoadedData && this.commonService.userDataLoaded$.value) {
      return;
    }

    try {
      const empRes: any = await firstValueFrom(
        this.http.getData(this.constants.employeeData),
      );

      if (empRes?.success && empRes.data?.employee) {
        const employeeData = {
          ...empRes.data.employee,
          employeeNumber: this.employeeNumber,
        };
        this.commonService.setEmployeeData(employeeData);
        localStorage.setItem("employeeData", JSON.stringify(employeeData));
      }

      if (role === "MANAGER") {
        await this.loadManagerData();
      }

      const needsAllStyleFilters =
        role === "MANAGER" ||
        role === "ADMIN" ||
        localStorage.getItem("department") === "HR" ||
        (this.department === "ACCOUNTS" && role === "EMPLOYEE");
      if (needsAllStyleFilters) {
        await this.loadManagerList();
        await this.loadAllEmployeeData();
      }

      this.commonService.userDataLoaded$.next(true);
      this.hasLoadedData = true;
    } catch (err) {
      this.commonService.userDataLoaded$.next(false);
    }
  }

  async loadAllEmployeeData() {
    if (this.commonService.allEmployeeData.length > 0) {
      return;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.allEmployeeData),
      );
      if (res?.success && res.data?.employees) {
        this.commonService.setAllEmployeeData(res.data.employees);
        localStorage.setItem(
          "allEmployeeData",
          JSON.stringify(res.data.employees),
        );
      }
    } catch (err) {
      console.error("All Employee Data API Error:", err);
    }
  }

  async loadManagerData() {
    if (this.commonService.managerEmployeeData.length > 0) {
      return;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.mangerEmployeeData),
      );
      if (res?.success && res.data?.employees) {
        this.commonService.setManagerEmployeeData(res.data.employees);
        localStorage.setItem(
          "managerEmployeeData",
          JSON.stringify(res.data.employees),
        );
      }
    } catch (err) {
      console.error("Manager Employee Data API Error:", err);
    }
  }

  ngDoCheck(): void {
    if (!this.showTabs) return;

    this.tabs.forEach((tab) => {
      const shouldBeActive = this.isActive(tab.path);
      if (tab.isActive !== shouldBeActive) {
        tab.isActive = shouldBeActive;
      }
    });
  }

  navigateTo(path: string) {
    const isDashboardRoute =
      path === "dashboard" ||
      path === "od-dashboard" ||
      path === "hr-admin-dashboard";

    if (isDashboardRoute) {
      const defaultView = this.role === "ADMIN" ? "all" : "self";
      this.commonService.selectedView = defaultView;
      this.commonService.viewChange$.next(defaultView);
    }

    this.router.navigate([path], {
      queryParams: this.getQueryParamsFromUrl()
    });
  }

  onDashboardModeChange(mode: "wfh" | "od"): void {
    this.dashboardMode = mode;
    this.initializeTabs(this.role, this.department);
    const targetPath =
      this.role === "ADMIN"
        ? mode === "wfh"
          ? "dashboard"
          : "od-dashboard"
        : mode === "wfh"
          ? ""
          : "on-duty-request";

    if (targetPath === "dashboard" || targetPath === "od-dashboard") {
      const defaultView = this.role === "ADMIN" ? "all" : "self";
      this.commonService.selectedView = defaultView;
      this.commonService.viewChange$.next(defaultView);
    }

    this.router.navigate([targetPath], {
      queryParams: this.getQueryParamsFromUrl()
    });
  }

  private syncDashboardModeWithUrl(url: string): void {
    const path = url.split("?")[0];
    const isHrAdminDashboard = path.includes("hr-admin-dashboard");
    const urlMode = isHrAdminDashboard
      ? this.dashboardMode
      : path.includes("od-dashboard") || path.includes("on-duty-request")
        ? "od"
        : path.includes("dashboard") ||
            path === "" ||
            path.includes("create-request")
          ? "wfh"
          : this.dashboardMode;

    if (this.dashboardMode !== urlMode) {
      this.dashboardMode = urlMode;
      if (this.role) this.initializeTabs(this.role, this.department);
    }
  }

  isActive(path: string): boolean {
    const currentUrl = this.router.url.split("?")[0].replace(/^\/+/, "");
    const cleanedPath = path.replace(/^\/+/, "");

    if (cleanedPath === "") {
      return (
        currentUrl === "" ||
        currentUrl.startsWith("create-wfo-exception-request")
      );
    }

    return (
      currentUrl === cleanedPath || currentUrl.startsWith(cleanedPath + "/")
    );
  }

  updateActiveTabs(url: string) {
    if (!this.showTabs) return;

    const currentUrl = url.split("?")[0].replace(/^\/+/, "");

    this.tabs.forEach((tab) => {
      const path = tab.path.replace(/^\/+/, "");

      if (path === "") {
        tab.isActive =
          currentUrl === "" ||
          currentUrl.startsWith("create-wfo-exception-request");
      } else {
        tab.isActive = currentUrl === path || currentUrl.startsWith(path + "/");
      }
    });
    this.pageLoading = false;
  }

  onViewChange(event: any, isAttendanceView: boolean = false) {
    if (isAttendanceView) {
      this.commonService.attendanceView = event.target.value;
      localStorage.setItem("attendanceView", this.commonService.attendanceView);
      this.commonService.attendanceViewChange$.next(
        this.commonService.attendanceView,
      );
      return;
    }
    this.commonService.selectedView = event.target.value;
    this.commonService.viewChange$.next(this.commonService.selectedView);
  }

  private async loadManagerList() {
    if (this.commonService.managerList.length > 0) {
      return;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.managerList),
      );
      if (res?.success && res.data?.managers) {
        this.commonService.setManagerList(res.data.managers);
      }
    } catch (err) {
      console.error("Manager List API Error:", err);
    }
  }

  private setView(view: "all" | "self" | "resource" | "downline"): void {
    this.commonService.selectedView = view;
    this.commonService.viewChange$.next(view);
  }

  get displayedViewOptions() {
    if (!this.isRequestPage) return this.viewOptions;
    if (this.role === "EMPLOYEE" && this.department === "HR") {
      return this.viewOptions.filter((option) => option.value === "self");
    }
    return this.viewOptions.filter(
      (option) => option.value === "self" || option.value === "downline",
    );
  }

  private getQueryParamsFromUrl(): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(window.location.search);

    searchParams.forEach((value, key) => {
      if (key.toLowerCase() !== "sessionid") {
        params[key] = value;
      }
    });

    const sessionId =
      searchParams.get("sessionid") ||
      searchParams.get("sessionId") ||
      localStorage.getItem("sessionid");
    if (sessionId) {
      params["sessionid"] = sessionId;
    }

    return params;
  }

  /**
   * Check if tabs should be displayed
   * Tabs are shown only after authentication is complete
   */
  get shouldShowTabs(): boolean {
    return this.showTabs && !this.isAuthenticating && this.tabs.length > 0;
  }
}
