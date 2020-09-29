import { get } from 'lodash'
import events from '../../vendor/devdocs/assets/javascripts/lib/events.coffee'
import page from '../../vendor/devdocs/assets/javascripts/lib/page.coffee'
import util from '../../vendor/devdocs/assets/javascripts/lib/util.coffee'
import appModule from '../../vendor/devdocs/assets/javascripts/app/app.coffee'
import searcher from '../../vendor/devdocs/assets/javascripts/app/searcher.coffee'
import entry from '../../vendor/devdocs/assets/javascripts/models/entry.coffee'

// eslint-disable-next-line no-new-func
new Function(`
  ${events};
  ${page};
  ${util};
  ${appModule};

  app.config = { max_results: 50 };
  app.Model = function (o) {
    for (k in o) this[k] = o[k]
  };

  ${searcher};
  ${entry};
`)()

// eslint-disable-next-line @typescript-eslint/naming-convention
const { Searcher, models: { Entry } } = get(window, 'app')
export { Searcher, Entry }
