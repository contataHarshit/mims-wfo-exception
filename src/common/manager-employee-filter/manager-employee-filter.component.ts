import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CommonSelectComponent } from "../common-select/common-select.component";
import { CommonService } from "../../service/common.service";
import { Subject, takeUntil } from "rxjs";
import { log } from "util";

@Component({
  selector: "app-manager-employee-filter",
  standalone: true,
  imports: [CommonModule, FormsModule, CommonSelectComponent],
  templateUrl: "./manager-employee-filter.component.html",
  styleUrl: "./manager-employee-filter.component.scss",
})
export class ManagerEmployeeFilterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() managerDisabled = false;
  @Input() employeeDisabled = false;
  // ✅ store ONLY IDs
  @Input() managerValue: any = null;
  @Input() employeeValue: any = null;

  @Output() managerValueChange = new EventEmitter<any>();
  @Output() employeeValueChange = new EventEmitter<any>();
  @Input() gap: string = "10vw"; // ✅ DEFAULT

  managerList: any[] = [];
  employeeList: any[] = [];
  private allEmployees: any[] = [];

  constructor(
    private commonService: CommonService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}
  currentView: string = "";
  ngOnInit(): void {
    // MANAGERS (already formatted from service)
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.managerList = list || [];
      });

    // ALL EMPLOYEES
    this.commonService.allEmployeeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (!data?.length) return;

        this.allEmployees = data;

        if (this.managerValue) {
          this.filterEmployeesByManager(this.managerValue);
        } else {
          this.employeeList = this.mapEmployees(data);
        }
      });
  }
  ngOnChanges(changes: SimpleChanges): void {
    // ✅ When employee filter is disabled (SELF VIEW)
    if (isPlatformBrowser(this.platformId)) {
      this.currentView = localStorage.getItem("selectedView") || "self";
    }
    if (
      changes["employeeDisabled"]?.currentValue === true &&
      !this.employeeValue
    ) {
      this.setSelfEmployee();
    }
    if (
      changes["managerValue"]?.currentValue !==
      changes["managerValue"]?.previousValue
    ) {
      this.filterEmployeesByManager(this.managerValue);
    }
    if (this.currentView === "all" && !this.managerValue) {
      this.employeeList = this.mapEmployees(this.allEmployees);
    }
    if (this.currentView === "resource" ) {
      
      let temp = JSON.parse(
        localStorage.getItem("managerEmployeeData") || "[]",
      );
      let tempManagerVal= localStorage.getItem("employeeData") || null;
      this.managerValue=tempManagerVal? {value:JSON.parse(tempManagerVal).EmployeeNumber,label:JSON.parse(tempManagerVal).employeeName} : null;
      this.employeeList = this.mapEmployees(temp);
    }
    if (
      this.currentView == "all" &&
      !this.managerValue &&
      changes["employeeValue"]?.currentValue !==
        changes["employeeValue"]?.previousValue
    ) {
      this.onEmployeeChange(changes["employeeValue"]?.currentValue);
    }
  }
  private setSelfEmployee() {
    if (localStorage.getItem("selectedView") == "self") {
      const storedEmployee = localStorage.getItem("employeeData");
      if (!storedEmployee) return;

      const emp = JSON.parse(storedEmployee);

      const label = `${emp.employeeName || emp.fullName || emp.name} (${emp.employeeNumber})`;

      // ✅ IMPORTANT: options must contain the selected value
      this.employeeList = [
        {
          label,
          value: emp.employeeNumber,
        },
      ];

      // ✅ value must match option.value
      this.employeeValue = {
        label: emp.employeeName,
        value: emp.employeeNumber,
      };

      // propagate to parent
      this.employeeValueChange.emit(this.employeeValue);
    }
  }

  /* ================= EVENTS ================= */

  onManagerChange(managerEmpNo: string) {
    this.filterEmployeesByManager(managerEmpNo);
    this.managerValue = managerEmpNo;
    this.managerValueChange.emit(managerEmpNo);

    if (!this.managerValue) {
      this.employeeList = this.mapEmployees(this.allEmployees);
      this.employeeValue = null;
    }
    this.employeeValue = null;
    this.employeeValueChange.emit(null);
  }

  onEmployeeChange(employeeEmpNo: any) {
    if (this.currentView === "resource" && this.managerValue) {
      this.employeeValue = employeeEmpNo;
      this.employeeValueChange.emit(employeeEmpNo);
      return;
    }

    this.managerValue = this.allEmployees.find(
      (e: any) => e.EmployeeNumber == employeeEmpNo.ManagerCode,
    );
    if (this.managerValue) {
      this.managerValue.value = this.managerValue.EmployeeNumber;
      this.managerValue.label = `${this.managerValue.FullName} (${this.managerValue.EmployeeNumber})`;
      this.filterEmployeesByManager(this.managerValue);
    }
    if (!this.managerValue) {
      this.employeeList = this.mapEmployees(this.allEmployees);
      this.employeeValue = null;
    }
    this.managerValueChange.emit(this.managerValue || null);

    this.employeeValue = employeeEmpNo;
    this.employeeValueChange.emit(employeeEmpNo);

    // const emp = this.allEmployees.find(
    //   e => e.EmployeeNumber === employeeEmpNo
    // );

    // if (!emp) {
    //   console.warn('Employee not found:', employeeEmpNo);
    //   return;
    // }

    // if (!emp.ManagerCode) {
    //   console.warn('Employee has no ManagerCode:', emp);
    //   return;
    // }

    // console.log('Employee:', emp.FullName, '| ManagerCode:', emp.ManagerCode);

    // // Verify manager exists in managerList
    // const managerExists = this.managerList.find(m => m.value === emp.ManagerCode);
    // console.log('Manager found in list:', managerExists);

    // // ✅ Auto-select the employee's manager
    // this.managerValue = emp.ManagerCode;
    // this.managerValueChange.emit(emp.ManagerCode);

    // // Filter employees by this manager
    // this.filterEmployeesByManager(emp.ManagerCode);

    // console.log('Manager value set to:', this.managerValue);
  }

  /* ================= HELPERS ================= */

  private filterEmployeesByManager(managerEmpNo: any) {
    this.employeeList = [];
    const filtered = this.allEmployees.filter(
      (e) => e.ManagerCode === managerEmpNo?.value,
    );
    this.employeeList = this.mapEmployees(filtered);
  }

  private mapEmployees(list: any[]) {
    return list.map((e) => ({
      label: `${e.FullName} (${e.EmployeeNumber})`,
      value: e.EmployeeNumber,
      ManagerCode: e.ManagerCode,
    }));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
