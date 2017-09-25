import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import {TranslateService} from '@ngx-translate/core';
import {GarlandToolsService} from './garland-tools.service';
import {Recipe} from '../../model/list/recipe';
import {I18nName} from '../../model/list/i18n-name';
import {ItemData} from '../../model/garland-tools/item-data';
import {NgSerializerService} from '@kaiu/ng-serializer/ng-serializer.service';

@Injectable()
export class DataService {

    private xivdbUrl = 'https://api.xivdb.com';
    private garlandUrl = 'https://www.garlandtools.org/db/data';

    constructor(private http: HttpClient,
                private i18n: TranslateService,
                private gt: GarlandToolsService,
                private serializer: NgSerializerService) {
    }

    public getItem(id: number): Observable<ItemData> {
        return this.getGarland(`/item/${id}`)
            .map(item => this.serializer.deserialize<ItemData>(item, ItemData));
    }

    public getNpc(id: number): any {
        return this.getGarland(`/npc/${id}`);
    }

    public searchRecipe(query: string): Observable<Recipe[]> {
        return this.getXivdb(`/search?string=${query}&one=items&language=${this.i18n.currentLang}`)
            .mergeMap((res: any) => {
                const pages = [];
                if (res.items.paging.total === 1 || res.items.paging.total === 0) {
                    return Observable.of(res);
                }
                for (let p = 2; p < res.items.paging.total; p++) {
                    pages.push(
                        // First we create a dummy Observable
                        Observable.of({})
                        // Then we add a delay for xivdb
                            .delay((p - 2) * 200)
                            // And we finaly do the request for the next page
                            .mergeMap(() => this.getXivdb(`/search?string=${query}&one=items&language=${this.i18n.currentLang}&page=${p}`))
                    );
                }
                return Observable.combineLatest(...pages, (...pagesContent: any[]) => {
                    for (const pageContent of pagesContent) {
                        res.items.results.push(...pageContent.items.results);
                    }
                    return res;
                });
            })
            .do(() => console.log('Step 1'))
            .map((results: any) => {
                return results.items.results.filter(i => {
                    return this.gt.getItem(i.id).f === 1;
                });
            })
            .do(() => console.log('Step 2'))
            .mergeMap(results => {
                const recipes: Observable<any>[] = [];
                results.forEach(item => {
                    recipes.push(this.getItem(item.id));
                });
                if (recipes.length === 0) {
                    return Observable.of([]);
                }
                return Observable.combineLatest(...recipes, (...details) => {
                    const res: Recipe[] = [];
                    for (const row of details) {
                        const item = row.item;
                        for (const craft of item.craft) {
                            const recipe: Recipe = {
                                recipeId: craft.id,
                                itemId: item.id,
                                job: craft.job,
                                stars: craft.stars,
                                name: {fr: item.fr.name, en: item.en.name, ja: item.ja.name, de: item.de.name},
                                lvl: craft.lvl,
                                icon: item.icon,
                                url_xivdb: this.getXivdbUrl(item.id, item.en.name)
                            };
                            res.push(recipe);
                        }
                    }
                    return res;
                });
            });
    }

    public getXivdbUrl(id: number, name: string): I18nName {
        const urlName = name.replace(/ /g, '+').toLowerCase();
        return {
            fr: `http://fr.xivdb.com/item/${id}/${urlName}`,
            en: `http://xivdb.com/item/${id}/${urlName}`,
            de: `http://de.xivdb.com/item/${id}/${urlName}`,
            ja: `http://ja.xivdb.com/item/${id}/${urlName}`
        };
    }

    public searchCharacter(name: string, server: string): Observable<any[]> {
        return this.http.get<any>(`https://xivsync.com/character/search?name=${name}&server=${server}`)
            .map(res => res.data.results)
            .map(res => res.filter(char => char.name === name));
    }

    public getCharacter(id: number): Observable<any> {
        return this.http.get<any>(`https://xivsync.com/character/parse/${id}`);
    }

    private getXivdb(uri: string): Observable<any> {
        return this.http.get<any>(this.xivdbUrl + uri);
    }

    private getGarland(uri: string): Observable<any> {
        return this.http.get<any>(this.garlandUrl + uri + '.json');
    }
}
