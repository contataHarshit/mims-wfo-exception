import { Component, DoCheck, OnInit, Inject, PLATFORM_ID } from "@angular/core";
import { Router, RouterOutlet, ActivatedRoute } from "@angular/router";
import { HeaderComponent } from "../components/header/header.component";
import { CommonService } from "../service/common.service";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { HttpService } from "../service/http.service";
import { ConstantService } from "../service/constant.service";
import { HttpClientModule } from "@angular/common/http";
import { CommonLoaderComponent } from "../common/common-loader/common-loader.component";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    HeaderComponent,
    CommonModule,
    HttpClientModule,
    CommonLoaderComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements DoCheck, OnInit {
  title = "Mims-exception-wfo";

  tabs = [
    { label: "Create WFO Exception Request", path: "", isActive: false },
    { label: "WFO Dashboard", path: "dashboard", isActive: false },
  ];

  jwtToken: string | null = null;

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

    const storedToken = localStorage.getItem("jwtToken");

    this.route.queryParams.subscribe((params) => {
      const sessionId = params["sessionid"];

      if (!storedToken && sessionId) {
        this.http
          .auth(this.constants.auth, { sessionid: sessionId })
          .subscribe({
            next: (response: any) => {
              const employee = response?.data?.employee || {};
              this.jwtToken = response?.data?.token || null;

              Object.keys(employee).forEach((key) => {
                localStorage.setItem(key, employee[key]);
              });

              if (this.jwtToken) {
                localStorage.setItem("jwtToken", this.jwtToken);
              }

              console.log("Auth Response:", response);
              this.loadEmployeeData();
            },
            error: (err) => {
              console.error("Auth API Error:", err);
            },
          });
      } else {
        this.jwtToken = storedToken;
        this.commonService.userDataLoaded$.next();
        this.loadEmployeeData();
        if (localStorage.getItem("role") === "MANAGER") {
          console.log("1");

          this.loadManagerData();
        } else if (localStorage.getItem("role") === "HR") {
          this.loadAllEmployeeData();
        }
      }
    });
  }
  loadAllEmployeeData() {
    this.http.getData(this.constants.allEmployeeData).subscribe({
      next: (empResponse: any) => {
        console.log("All Employee Data Response:", empResponse);
        localStorage.setItem(
          "allEmployeeData",
          JSON.stringify(empResponse.data.employees || [])
        );
      },
      error: (err) => {
        console.error("All Employee Data API Error:", err);
      },
    });
  }

  loadManagerData() {
    this.http.getData(this.constants.mangerEmployeeData).subscribe({
      next: (mgrResponse: any) => {
        console.log("Manager Employee Data Response:", mgrResponse);
        if (mgrResponse?.success) {
          localStorage.setItem(
            "managerEmployeeData",
            JSON.stringify(mgrResponse.data.employees || [])
          );
        }
      },
      error: (err) => {
        console.error("Manager Employee Data API Error:", err);
      },
    });
  }
  loadEmployeeData() {
    this.http.getData(this.constants.employeeData).subscribe({
      next: (empResponse: any) => {
        console.log("Employee Data Response:", empResponse);
        localStorage.setItem(
          "projectManager",
          empResponse?.data?.employee?.managerName?.name || ""
        );
        this.commonService.userDataLoaded$.next();
      },
      error: (err) => {
        console.error("Employee Data API Error:", err);
      },
    });
  }

  ngDoCheck(): void {
    this.tabs.forEach((tab) => {
      tab.isActive = this.isActive(tab.path);
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    const currentUrl = this.router.url.replace(/^\/+/, "");
    const cleanedPath = path.replace(/^\/+/, "");

    if (cleanedPath === "") {
      return currentUrl === "" || currentUrl === "create-wfo-exception-request";
    }

    return currentUrl === cleanedPath;
  }
}
