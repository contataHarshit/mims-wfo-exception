import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";
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

  // ✅ store ONLY IDs
  @Input() managerValue: any = null;
  @Input() employeeValue: any = null;

  @Output() managerValueChange = new EventEmitter<any>();
  @Output() employeeValueChange = new EventEmitter<any>();
  @Input() gap: string = '10vw';        // ✅ DEFAULT

  managerList: any[] = [];
  employeeList: any[] = [];
  private allEmployees: any[] = [];

  constructor(private commonService: CommonService) {}

  ngOnInit(): void {
    // MANAGERS (already formatted from service)
    this.commonService.managerList$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.managerList = list || [];
        console.log("this manager list", this.managerList);
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

  /* ================= EVENTS ================= */

  onManagerChange(managerEmpNo: string) {
    console.log("managerEmpNo", managerEmpNo);
    this.filterEmployeesByManager(managerEmpNo);
    this.managerValue = managerEmpNo;
    this.managerValueChange.emit(managerEmpNo);
    console.log("1111111111111");
    
    // reset employee
     if(!this.managerValue ){
      this.employeeList = this.mapEmployees(this.allEmployees);
      this.employeeValue = null;
    }
    this.employeeValue = null;
    this.employeeValueChange.emit(null);
  }

  onEmployeeChange(employeeEmpNo: any) {
    console.log("emp", employeeEmpNo, this.employeeList, this.allEmployees);

    this.managerValue = this.allEmployees.find(
      (e: any) => e.EmployeeNumber == employeeEmpNo.ManagerCode
    );
    if (this.managerValue) {
      console.log("wwwwwwwwwwwwwww");
      this.managerValue.value = this.managerValue.EmployeeNumber;
      this.managerValue.label = `${this.managerValue.FullName} (${this.managerValue.EmployeeNumber})`;
       this.filterEmployeesByManager(this.managerValue);
    }
    if(!this.managerValue ){
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
    console.log("filterEmployeesByManager", managerEmpNo);
    this.employeeList = [];
    const filtered = this.allEmployees.filter(
      (e) => e.ManagerCode === managerEmpNo?.value
    );
    this.employeeList = this.mapEmployees(filtered);
  }

  private mapEmployees(list: any[]) {
    console.log("list", list);

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
