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

  tabs = [
    { label: "Create WFH Request", path: "", isActive: false },
    { label: "WFH Dashboard", path: "dashboard", isActive: false },
  ];

  token: string | null = null;
  role = "";
  isDashboardPage = false;
  selectedView: "all" | "self" | "resource" = "self";
  viewOptions = [
    {
      label: "Self",
      value: "self",
    },
    {
      label: "Resource",
      value: "resource",
    },
  ];
  employeeNumber: string = "";
  pageLoading: boolean = true;
  department: string = "";
  isAttendanceDashboardPage = false;
  attendanceViewOptions = [
    {
      label: "Upload",
      value: "upload",
    },
    {
      label: "View",
      value: "view",
    },
    {
      label:"Add",
      value:"add"
    }
  ];
  private destroy$ = new Subject<void>();
  isAuthenticating = true;
  private hasLoadedData = false;

  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.commonService.selectedView = "self";

    if (!isPlatformBrowser(this.platformId)) return;

    this.commonService.loadConfig().finally(() => {});

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        const url = navEnd.urlAfterRedirects;
        this.isDashboardPage = url
          .split("?")[0]
          .split("-")[0]
          .includes("dashboard");
        this.isAttendanceDashboardPage = url
          .split("?")[0]
          .split("-")[0]
          .includes("attendance");
        this.updateActiveTabs(url);
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
    console.log("token", this.token);

    if (sessionId && !this.token) {
      if (localStorage.getItem("department") == "HR") {
        this.viewOptions.unshift({ label: "All", value: "all" });
      }
      this.authenticateWithSession(sessionId);
    } else {
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");

      if (storedToken && storedRole && !this.hasLoadedData) {
        this.token = storedToken;
        this.role = storedRole;
        this.employeeNumber = localStorage.getItem("employeeNumber") || "";
        this.department = localStorage.getItem("department") || "";

        this.commonService.setRole(storedRole);
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

  private authenticateWithSession(sessionId: string) {
    // if (this.isAuthenticating) {
    //   console.log("Authentication already in progress, skipping...");
    //   return;
    // }

    this.isAuthenticating = true;
    firstValueFrom(
      this.http.auth(this.constants.auth, { sessionid: sessionId })
    )
      .then((response: any) => {
        const employee = response?.data?.employee || {};
        this.token = response?.data?.token || null;
        this.role = employee.role || "";
        this.employeeNumber = employee.employeeNumber || "";
        this.department = employee.department || "";

        localStorage.setItem("token", this.token || "");
        localStorage.setItem("role", this.role);
        localStorage.setItem("department", this.department);
        localStorage.setItem("employeeNumber", this.employeeNumber);
        this.commonService.setRole(this.role);
        if (this.role === "ADMIN") {
          this.router.navigate(["/dashboard"], {
            queryParamsHandling: "preserve",
          });
        }

        const savedView = localStorage.getItem("selectedView");
        if (savedView) {
          this.commonService.selectedView = savedView as
            | "self"
            | "resource"
            | "all";
        } else {
          this.setDefaultViewByRole(this.role);
        }

        this.commonService.viewChange$.next(this.commonService.selectedView);

        this.hasLoadedData = true;
        this.isAuthenticating = false;
        return this.loadRoleSpecificData(this.role);
      })
      .catch((err) => {
        // console.error("Auth API Error:", err);
        // this.commonService.userDataLoaded$.next(false);
      })
      .finally(() => {
        // this.isAuthenticating = false;
      });
  }

  setDefaultViewByRole(role: string) {
    const department = localStorage.getItem("department") || "";
    this.viewOptions = [
      { label: "Self", value: "self" },
      { label: "Resource", value: "resource" },
    ];
    if (role === "ADMIN") {
      this.addAllOption();
      return;
    }
    if (department === "HR") {
      this.addAllOption();
      if (role === "EMPLOYEE") {
        this.viewOptions = this.viewOptions.filter(
          (o) => o.value !== "resource"
        );
      }
      return;
    }
    if (role === "MANAGER") {
      this.commonService.selectedView = "self";
      localStorage.setItem("selectedView", "self");
      return;
    }
    if (role === "EMPLOYEE") {
      this.viewOptions = this.viewOptions.filter((o) => o.value === "self");
      this.commonService.selectedView = "self";
      localStorage.setItem("selectedView", "self");
      return;
    }
    const savedView = localStorage.getItem("selectedView");
    if (
      savedView === "all" ||
      savedView === "self" ||
      savedView === "resource"
    ) {
      this.commonService.selectedView = savedView;
    } else {
      this.commonService.selectedView = "self";
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
        this.http.getData(this.constants.employeeData)
      );

      if (empRes?.success && empRes.data?.employee) {
        const employeeData = {
          ...empRes.data.employee,
          employeeNumber: this.employeeNumber,
        };
        this.commonService.setEmployeeData(employeeData);
        localStorage.setItem("employeeData", JSON.stringify(employeeData));
        if (
          this.role == "ADMIN" ||
          localStorage.getItem("department") === "HR" ||
          (this.department == "ACCOUNTS" && role === "EMPLOYEE")
        ) {
          const managerRes: any = await firstValueFrom(
            this.http.getData(this.constants.managerList)
          );
          if (managerRes?.success && managerRes.data?.managers) {
            this.commonService.setManagerList(managerRes.data.managers);
          }
        }
      }

      if (role === "MANAGER") {
        await this.loadManagerData();
      }

      if (localStorage.getItem("department") === "HR" || role === "ADMIN") {
        await this.loadAllEmployeeData();
        if (role === "ADMIN") {
          this.tabs = this.tabs.filter((t) => t.label !== "Create WFH Request");
        }
        if (!this.tabs.some((t) => t.label === "HR Admin Dashboard")) {
          this.tabs.push({
            label: "HR Admin Dashboard",
            path: "hr-admin-dashboard",
            isActive: false,
          });
        }

        this.updateActiveTabs(this.router.url);
      }
      // if (
      //   !this.tabs.some((t) => t.label === "Attendance Dashboard") &&
      //   this.commonService.employeeName.toLowerCase().includes("naushada")
      // ) {
      if (this.department == "HR" || role === "ADMIN") {
        if (!this.tabs.some((t) => t.label === "Correction Dashboard")) {
          this.tabs.push({
            label: "Correction Dashboard",
            path: "correction-dashboard",
            isActive: false,
          });
        }
      }
      if (
        (this.department == "ACCOUNTS" && role === "EMPLOYEE") ||
        role === "ADMIN"
      ) {
        if (!this.tabs.some((t) => t.label === "Attendance Dashboard")) {
          this.tabs.push({
            label: "Attendance Dashboard",
            path: "attendance-dashboard",
            isActive: false,
          });
        }
        this.loadAllEmployeeData();
      }

      // }

      this.commonService.userDataLoaded$.next(true);
      this.hasLoadedData = true;
    } catch (err) {
      console.error("Error loading role-specific data:", err);
      this.commonService.userDataLoaded$.next(false);
    }
  }

  async loadAllEmployeeData() {
    if (this.commonService.allEmployeeData.length > 0) {
      return;
    }

    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.allEmployeeData)
      );
      if (res?.success && res.data?.employees) {
        this.commonService.setAllEmployeeData(res.data.employees);
        localStorage.setItem(
          "allEmployeeData",
          JSON.stringify(res.data.employees)
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
        this.http.getData(this.constants.mangerEmployeeData)
      );
      if (res?.success && res.data?.employees) {
        this.commonService.setManagerEmployeeData(res.data.employees);
        localStorage.setItem(
          "managerEmployeeData",
          JSON.stringify(res.data.employees)
        );
      }
    } catch (err) {
      console.error("Manager Employee Data API Error:", err);
    }
  }

  ngDoCheck(): void {
    this.tabs.forEach((tab) => {
      const shouldBeActive = this.isActive(tab.path);
      if (tab.isActive !== shouldBeActive) {
        tab.isActive = shouldBeActive;
      }
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path], { queryParamsHandling: "preserve" });
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
        this.commonService.attendanceView
      );
      return;
    }
    this.commonService.selectedView = event.target.value;
    localStorage.setItem("selectedView", this.commonService.selectedView);
    this.commonService.viewChange$.next(this.commonService.selectedView);
  }
}
