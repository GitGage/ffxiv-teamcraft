import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { InventoryActionTypes, InventoryLoaded, UpdateInventory } from './inventory.actions';
import { UserInventoryService } from '../../../core/database/user-inventory.service';
import { debounceTime, distinctUntilKeyChanged, map, switchMap, switchMapTo } from 'rxjs/operators';
import { UserInventory } from '../../../model/user/inventory/user-inventory';
import { AuthFacade } from '../../../+state/auth.facade';
import { SettingsService } from '../../settings/settings.service';
import { of } from 'rxjs';
import { INVENTORY_FEATURE_KEY } from './inventory.reducer';
import { NgSerializerService } from '@kaiu/ng-serializer';
import { PlatformService } from '../../../core/tools/platform.service';

@Injectable()
export class InventoryEffects {

  @Effect()
  loadInventory$ = this.actions$.pipe(
    ofType(InventoryActionTypes.LoadInventory),
    switchMapTo(this.authFacade.user$),
    distinctUntilKeyChanged('$key'),
    switchMap((user) => {
      if (this.settings.persistInventory || !this.platform.isDesktop()) {
        return this.inventoryService.get(user.$key).pipe(
          map(inventory => {
            if (inventory === undefined) {
              const newInventory = new UserInventory();
              newInventory.characterId = user.defaultLodestoneId;
              return newInventory;
            }
            return inventory;
          })
        );
      } else {
        const fromLocalStorage = localStorage.getItem(INVENTORY_FEATURE_KEY);
        if (fromLocalStorage === null) {
          const newInventory = new UserInventory();
          newInventory.characterId = user.defaultLodestoneId;
          return of(newInventory);
        }
        return of(this.serializer.deserialize<UserInventory>(JSON.parse(fromLocalStorage), UserInventory));
      }
    }),
    map(inventory => new InventoryLoaded(inventory))
  );

  @Effect({ dispatch: false })
  updateInventory$ = this.actions$.pipe(
    ofType<UpdateInventory>(InventoryActionTypes.UpdateInventory),
    debounceTime(2000),
    switchMap(action => {
      if (this.settings.persistInventory) {
        if (action.payload.$key && action.force) {
          return this.inventoryService.set(action.payload.$key, action.payload);
        } else if (action.payload.$key) {
          return this.inventoryService.update(action.payload.$key, action.payload);
        } else {
          return this.inventoryService.add(action.payload);
        }
      } else {
        localStorage.setItem(INVENTORY_FEATURE_KEY, JSON.stringify(action.payload));
        return of(null);
      }
    })
  );

  constructor(
    private actions$: Actions,
    private inventoryService: UserInventoryService,
    private authFacade: AuthFacade,
    private settings: SettingsService,
    private serializer: NgSerializerService,
    private platform: PlatformService
  ) {
  }
}