import * as route0 from './app/api/graph/coverage/extract/route.ts';
import * as route1 from './app/api/activity/abort/route.ts';
import * as route2 from './app/api/graph/costs/route.ts';
import * as route3 from './app/api/graph/import/route.ts';
import * as route4 from './app/api/graph/positions/route.ts';
import * as route5 from './app/api/graph/render-settings/route.ts';
import * as route6 from './app/api/graph/status/route.ts';
import * as route7 from './app/api/settings/prompts/route.ts';
import * as route8 from './app/api/stt/token/route.ts';
import * as route9 from './app/api/subscriptions/browser/route.ts';
import * as route10 from './app/api/activity/route.ts';
import * as route11 from './app/api/chat/route.ts';
import * as route12 from './app/api/chats/route.ts';
import * as route13 from './app/api/claude-code/route.ts';
import * as route14 from './app/api/custom-provider/route.ts';
import * as route15 from './app/api/events/route.ts';
import * as route16 from './app/api/graph/route.ts';
import * as route17 from './app/api/jobs/route.ts';
import * as route18 from './app/api/keys/route.ts';
import * as route19 from './app/api/models/route.ts';
import * as route20 from './app/api/search/route.ts';
import * as route21 from './app/api/settings/route.ts';
import * as route22 from './app/api/subscriptions/route.ts';
import * as route23 from './app/api/chats/[id]/artifact-ui/route.ts';
import * as route24 from './app/api/chats/[id]/dismiss/route.ts';
import * as route25 from './app/api/chats/[id]/markdown/route.ts';
import * as route26 from './app/api/chats/[id]/settings/route.ts';
import * as route27 from './app/api/chats/[id]/steer/route.ts';
import * as route28 from './app/api/chats/[id]/stream/route.ts';
import * as route29 from './app/api/graph/nodes/[id]/route.ts';
import * as route30 from './app/api/settings/prompts/[...segment]/route.ts';
import * as route31 from './app/api/chats/[id]/route.ts';
import * as route32 from './app/api/keys/[id]/route.ts';
import * as route33 from './app/api/settings/[section]/route.ts';
export const routes=[{pattern:new RegExp("^/api/graph/coverage/extract/?$"),keys:[],module:route0},
{pattern:new RegExp("^/api/activity/abort/?$"),keys:[],module:route1},
{pattern:new RegExp("^/api/graph/costs/?$"),keys:[],module:route2},
{pattern:new RegExp("^/api/graph/import/?$"),keys:[],module:route3},
{pattern:new RegExp("^/api/graph/positions/?$"),keys:[],module:route4},
{pattern:new RegExp("^/api/graph/render-settings/?$"),keys:[],module:route5},
{pattern:new RegExp("^/api/graph/status/?$"),keys:[],module:route6},
{pattern:new RegExp("^/api/settings/prompts/?$"),keys:[],module:route7},
{pattern:new RegExp("^/api/stt/token/?$"),keys:[],module:route8},
{pattern:new RegExp("^/api/subscriptions/browser/?$"),keys:[],module:route9},
{pattern:new RegExp("^/api/activity/?$"),keys:[],module:route10},
{pattern:new RegExp("^/api/chat/?$"),keys:[],module:route11},
{pattern:new RegExp("^/api/chats/?$"),keys:[],module:route12},
{pattern:new RegExp("^/api/claude-code/?$"),keys:[],module:route13},
{pattern:new RegExp("^/api/custom-provider/?$"),keys:[],module:route14},
{pattern:new RegExp("^/api/events/?$"),keys:[],module:route15},
{pattern:new RegExp("^/api/graph/?$"),keys:[],module:route16},
{pattern:new RegExp("^/api/jobs/?$"),keys:[],module:route17},
{pattern:new RegExp("^/api/keys/?$"),keys:[],module:route18},
{pattern:new RegExp("^/api/models/?$"),keys:[],module:route19},
{pattern:new RegExp("^/api/search/?$"),keys:[],module:route20},
{pattern:new RegExp("^/api/settings/?$"),keys:[],module:route21},
{pattern:new RegExp("^/api/subscriptions/?$"),keys:[],module:route22},
{pattern:new RegExp("^/api/chats/([^/]+)/artifact-ui/?$"),keys:["id"],module:route23},
{pattern:new RegExp("^/api/chats/([^/]+)/dismiss/?$"),keys:["id"],module:route24},
{pattern:new RegExp("^/api/chats/([^/]+)/markdown/?$"),keys:["id"],module:route25},
{pattern:new RegExp("^/api/chats/([^/]+)/settings/?$"),keys:["id"],module:route26},
{pattern:new RegExp("^/api/chats/([^/]+)/steer/?$"),keys:["id"],module:route27},
{pattern:new RegExp("^/api/chats/([^/]+)/stream/?$"),keys:["id"],module:route28},
{pattern:new RegExp("^/api/graph/nodes/([^/]+)/?$"),keys:["id"],module:route29},
{pattern:new RegExp("^/api/settings/prompts/(.+)/?$"),keys:["...segment"],module:route30},
{pattern:new RegExp("^/api/chats/([^/]+)/?$"),keys:["id"],module:route31},
{pattern:new RegExp("^/api/keys/([^/]+)/?$"),keys:["id"],module:route32},
{pattern:new RegExp("^/api/settings/([^/]+)/?$"),keys:["section"],module:route33}];
