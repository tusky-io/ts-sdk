import { Subject } from "rxjs"

export class CacheBusters {
  static cache: boolean;
  static profile = new Subject<any>();
  static vaults = new Subject<any>();
}
