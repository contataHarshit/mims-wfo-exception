import { Environment } from '../../src/environments/environment';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConstantService {

  baseUrl = Environment.baseUrl;
  auth=this.baseUrl+'api/auth';
  exceptionRequest=this.baseUrl+'api/exception-requests';
  employeeData=this.baseUrl+'api/emplyee';
  constructor() { }
}