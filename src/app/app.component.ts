// FILE: app.component.ts
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
  pageLoading: boolean = true;
  department:string=""
  constructor(
    public commonService: CommonService,
    private router: Router,
    private http: HttpService,
    private constants: ConstantService,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

ngOnInit() {
  this.selectedView = "self";

  if (!isPlatformBrowser(this.platformId)) return;

  this.commonService.loadConfig().finally(() => {});

  // Track navigation for tabs
this.router.events
  .pipe(filter(e => e instanceof NavigationEnd))
  .subscribe((event) => {
    const navEnd = event as NavigationEnd; // assert type
    const url = navEnd.urlAfterRedirects;
    this.isDashboardPage = url.split("?")[0].includes("dashboard");
    this.updateActiveTabs(url);
  });


  // ✅ Simply get query param from the full URL
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("sessionid");
  if (sessionId) {
    console.log("Session ID from URL:", sessionId); // <-- WILL LOG
    this.authenticateWithSession(sessionId);
  }

  // Load stored token & role if available
  const storedToken = localStorage.getItem("jwtToken");
  const storedRole = localStorage.getItem("role");
  if (storedToken && storedRole) {
    this.jwtToken = storedToken;
    this.role = storedRole;
    this.commonService.setRole(storedRole);
    this.setDefaultViewByRole(this.role);
    this.commonService.viewChange$.next(this.selectedView);
    console.log("23333333333333333");
    
    this.loadRoleSpecificData(this.role).finally(() => {});
  }
}


  private authenticateWithSession(sessionId: string) {
    console.log("222222222222222222222222");
    
    firstValueFrom(
      this.http.auth(this.constants.auth, { sessionid: sessionId })
    )
      .then((response: any) => {
        const employee = response?.data?.employee || {};
        this.jwtToken = response?.data?.token || null;
        this.role = employee.role || "";
        this.employeeNumber = employee.employeeNumber || "";
        this.department=employee.department||""
        // Store auth-related data
        localStorage.setItem("jwtToken", this.jwtToken || "");
        localStorage.setItem("role", this.role);
        localStorage.setItem("department", employee.department || "");
        localStorage.setItem("employeeNumber", this.employeeNumber);
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
        this.commonService.userDataLoaded$.next(false);
      })
      .finally(() => {
        
      });
  }

  setDefaultViewByRole(role: string) {
    const department = localStorage.getItem("department") || "";

    // Step 1: Start with default base options
    this.viewOptions = [
      { label: "Self", value: "self" },
      { label: "Resource", value: "resource" },
    ];

    // Step 2: Handle ADMIN
    if (role === "ADMIN") {
      this.addAllOption();
      this.selectedView = "all";
      localStorage.setItem("selectedView", "all");
      return;
    }

    // Step 3: Handle HR + Manager / Employee
    if (department === "HR") {
      this.addAllOption();
      this.selectedView = "all";
      localStorage.setItem("selectedView", "all");

      // EMPLOYEE in HR should not see "resource"
      if (role === "EMPLOYEE") {
        this.viewOptions = this.viewOptions.filter(o => o.value !== "resource");
      }
      return;
    }

    // Step 4: Normal Manager (not HR)
    if (role === "MANAGER") {
      this.selectedView = "self";
      localStorage.setItem("selectedView", "self");
      return;
    }

    // Step 5: Normal Employee
    if (role === "EMPLOYEE") {
      this.viewOptions = this.viewOptions.filter(o => o.value === "self");
      this.selectedView = "self";
      localStorage.setItem("selectedView", "self");
      return;
    }

    // Step 6: Fallback
    const savedView = localStorage.getItem("selectedView");
    if (savedView === "all" || savedView === "self" || savedView === "resource") {
      this.selectedView = savedView;
    } else {
      this.selectedView = "self";
    }
  }

  private addAllOption() {
    if (!this.viewOptions.some(o => o.value === "all")) {
      this.viewOptions.unshift({ label: "All", value: "all" });
    }
  }

  async loadRoleSpecificData(role: string) {
    try {
      // Load employee data first
      const empRes: any = await firstValueFrom(
        this.http.getData(this.constants.employeeData)
      );

      if (empRes?.success && empRes.data?.employee) {
        console.log("llllllllllll");
        
        // Store in both service AND localStorage
        const employeeData = {
          ...empRes.data.employee,
          employeeNumber: this.employeeNumber,
        };
        this.commonService.setEmployeeData(employeeData);
        localStorage.setItem("employeeData", JSON.stringify(employeeData));
      console.log("ssssssssssssssssssssssss",localStorage.getItem("department"),role);

        // Load manager list
        if(role!=="EMPLOYEE" || localStorage.getItem("department")==="HR"){
          const managerRes: any = await firstValueFrom(
          this.http.getData(this.constants.managerList)
        );
        if (managerRes?.success && managerRes.data?.managers) {
          this.commonService.setManagerList(managerRes.data.managers);
        }
        }
      }

      // Load role-specific data and modify tabs
      console.log("ssssssssssssssssssssssss",localStorage.getItem("department"),role);
      
      if (role === "MANAGER") {
        await this.loadManagerData();
      }
      if (localStorage.getItem("department") === "HR" || role === "ADMIN") {
        await this.loadAllEmployeeData();
        console.log("11111111111111111");
        
        // For ADMIN: Remove "Create WFH Request" tab
        if (role === "ADMIN") {
          this.tabs = this.tabs.filter(t => t.label !== "Create WFH Request");
        }
        
        // Add HR Admin Dashboard tab if not already present
        if (!this.tabs.some(t => t.label === "HR Admin Dashboard")) {
          this.tabs.push({
            label: "HR Admin Dashboard",
            path: "hr-admin-dashboard",
            isActive: false,
          });
        }
        
        // Update active tabs after all modifications
        this.updateActiveTabs(this.router.url);
      }

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
        // Store in BOTH service and localStorage
        this.commonService.setAllEmployeeData(res.data.employees);
        localStorage.setItem("allEmployeeData", JSON.stringify(res.data.employees));
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
        // Store in BOTH service and localStorage
        this.commonService.setManagerEmployeeData(res.data.employees);
        localStorage.setItem("managerEmployeeData", JSON.stringify(res.data.employees));
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
        tab.isActive = currentUrl === "" || 
                       currentUrl.startsWith("create-wfo-exception-request");
      } else {
        tab.isActive = currentUrl === path || 
                       currentUrl.startsWith(path + "/");
      }
    });
    this.pageLoading = false;
  }

  onViewChange(event: any) {
    this.selectedView = event.target.value;
    localStorage.setItem("selectedView", this.selectedView);
    this.commonService.viewChange$.next(this.selectedView);
  }
}