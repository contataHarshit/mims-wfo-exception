import { Component, DoCheck, OnInit, Inject, PLATFORM_ID } from "@angular/core";
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
import { filter, firstValueFrom } from "rxjs";
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
export class AppComponent implements DoCheck, OnInit {
  title = "Mims-exception-wfo";

  tabs = [
    { label: "Create WFH Request", path: "", isActive: false },
    { label: "WFH Dashboard", path: "dashboard", isActive: false },
  ];

  jwtToken: string | null = null;
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
  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.commonService.setLoading(true);

    // Track navigation
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        this.isDashboardPage = url
          .split("?")[0]
          .split("-")[0]
          .includes("dashboard");
        this.updateActiveTabs(url);
      });

    // Detect current route immediately
    const currentUrl = this.router.url;
    this.isDashboardPage = currentUrl.includes("dashboard");

    // Load stored token & role ONLY
    const storedToken = localStorage.getItem("jwtToken");
    const storedRole = localStorage.getItem("role");

    if (storedToken && storedRole) {
      this.jwtToken = storedToken;
      this.role = storedRole;

      this.commonService.setRole(storedRole);

      if (storedRole === "ADMIN") {
        this.tabs.splice(0, 1);
      }

      this.setDefaultViewByRole(this.role);
      this.commonService.viewChange$.next(this.selectedView);

      this.loadRoleSpecificData(this.role).finally(() => {
        this.commonService.setLoading(false);
      });

      return;
    }

    // If sessionid login
    this.route.queryParams.subscribe((params) => {
      const sessionId = params["sessionid"];
      if (!sessionId) {
        this.commonService.setLoading(false);
        this.commonService.userDataLoaded$.next(false); // No auth data available
        return;
      }

      this.authenticateWithSession(sessionId);
    });
  }

  /** Extracted async logic to separate function */
  private authenticateWithSession(sessionId: string) {
    firstValueFrom(
      this.http.auth(this.constants.auth, { sessionid: sessionId })
    )
      .then((response: any) => {
        const employee = response?.data?.employee || {};
        this.jwtToken = response?.data?.token || null;
        this.role = employee.role || "";
        this.employeeNumber = employee.employeeNumber || "";
        // Store auth-related data FIRST
        localStorage.setItem("jwtToken", this.jwtToken || "");
        localStorage.setItem("role", this.role);
        localStorage.setItem("department", employee.department || "");
        this.commonService.setRole(this.role);

        // Load saved view or set default
        const savedView = localStorage.getItem("selectedView");
        if (savedView) {
          this.selectedView = savedView as "self" | "resource" | "all";
        } else {
          this.setDefaultViewByRole(this.role);
        }

        this.commonService.viewChange$.next(this.selectedView);

        // Load all role-specific data
        return this.loadRoleSpecificData(this.role);
      })
      .catch((err) => {
        console.error("Auth API Error:", err);
        this.commonService.userDataLoaded$.next(false); // Auth failed
      })
      .finally(() => {
        this.commonService.setLoading(false);
      });
  }

  setDefaultViewByRole(role: string) {
    // Ensure no duplicate "All" option
    const hasAll = this.viewOptions.some((o) => o.value === "all");
    console.log("11111111111111");

    if (role === "EMPLOYEE" || role === "HR" || role === "MANAGER") {
      console.log("222222222222");

      // Check if department is MANAGEMENT (from service, not localStorage)
      const department = localStorage.getItem("department") || "";
      console.log("department:", department);

      if (department === "MANAGEMENT" && role !== "EMPLOYEE") {
        console.log("sssssssssssss");

        if (!hasAll) {
          this.viewOptions = [
            { label: "All", value: "all" },
            ...this.viewOptions,
          ];
        }
        return;
      }
      this.selectedView = "self";
      localStorage.setItem("selectedView", "self");
    } else if (role === "ADMIN") {
      this.selectedView = "resource";
      localStorage.setItem("selectedView", "resource");
    } else {
      // Fallback
      const savedView = localStorage.getItem("selectedView") as
        | "self"
        | "resource"
        | "all"
        | null;
      this.selectedView = savedView ?? "self";
      localStorage.setItem("selectedView", this.selectedView);
    }
  }

  async loadRoleSpecificData(role: string) {
    try {
      // Load employee data first (contains basic info for all roles)
      const empRes: any = await firstValueFrom(
        this.http.getData(this.constants.employeeData)
      );

      if (empRes?.success && empRes.data?.employee) {
        // Store in service (not localStorage)
        this.commonService.setEmployeeData({
          ...empRes.data.employee,
          employeeNumber: this.employeeNumber,
        });

        // Load manager list
        const managerRes: any = await firstValueFrom(
          this.http.getData(this.constants.managerList)
        );
        if (managerRes?.success && managerRes.data?.managers) {
          this.commonService.setManagerList(managerRes.data.managers);
        }
      }

      // Load role-specific data
      if (role === "MANAGER") {
        await this.loadManagerData();
      } else if (role === "HR" || role === "ADMIN") {
        await this.loadAllEmployeeData();
        this.tabs.push({
          label: "HR Admin Dashboard",
          path: "hr-admin-dashboard",
          isActive: false,
        });
      }

      // Notify that data is loaded - THIS IS CRITICAL
      this.commonService.userDataLoaded$.next(true);
    } catch (err) {
      console.error("Error loading role-specific data:", err);
      this.commonService.userDataLoaded$.next(false);
    }
  }

  async loadAllEmployeeData() {
    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.allEmployeeData)
      );
      if (res?.success && res.data?.employees) {
        // Store in service instead of localStorage
        this.commonService.setAllEmployeeData(res.data.employees);
      }
    } catch (err) {
      console.error("All Employee Data API Error:", err);
    }
  }

  async loadManagerData() {
    try {
      const res: any = await firstValueFrom(
        this.http.getData(this.constants.mangerEmployeeData)
      );
      if (res?.success && res.data?.employees) {
        // Store in service instead of localStorage
        this.commonService.setManagerEmployeeData(res.data.employees);
      }
    } catch (err) {
      console.error("Manager Employee Data API Error:", err);
    }
  }

  ngDoCheck(): void {
    this.tabs.forEach((tab) => (tab.isActive = this.isActive(tab.path)));
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
      tab.isActive =
        path === ""
          ? currentUrl === "" ||
            currentUrl.startsWith("create-wfo-exception-request")
          : currentUrl === path || currentUrl.startsWith(path + "/");
    });
  }

  onViewChange(event: any) {
    this.selectedView = event.target.value;
    localStorage.setItem("selectedView", this.selectedView);
    this.commonService.viewChange$.next(this.selectedView);
  }
}
