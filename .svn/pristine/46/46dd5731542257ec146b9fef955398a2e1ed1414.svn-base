import { Injectable } from "@angular/core";
import { Environment } from "../../src/environments/environment";
@Injectable({
  providedIn: "root",
})
export class ConstantService {
  baseUrl = Environment.baseUrl;

  auth = this.baseUrl + "api/auth";

  exceptionRequest = this.baseUrl + "api/exception-requests";

  employeeData = this.baseUrl + "api/employee";

  mangerEmployeeData = this.employeeData + "/manager";

  allEmployeeData = this.employeeData + "/all";

  selectedDates = this.exceptionRequest + "/selected-dates";

  hrSummary = this.exceptionRequest + "/summary";

  managerList = this.employeeData + "/managers/list";

  constructor() {}
}
