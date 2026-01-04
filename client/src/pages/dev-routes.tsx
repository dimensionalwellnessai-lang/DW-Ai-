import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTE_REGISTRY, getMenuRoutes } from "@/routes/registry";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function DevRoutesPage() {
  const allRoutes = ROUTE_REGISTRY;
  const menuRoutes = getMenuRoutes();
  
  const enabledRoutes = allRoutes.filter(r => r.enabled);
  const disabledRoutes = allRoutes.filter(r => !r.enabled);
  const routesWithGuards = allRoutes.filter(r => r.guard);
  const routesWithActions = allRoutes.filter(r => r.actions && r.actions.length > 0);

  const actionTargets = new Set<string>();
  allRoutes.forEach(route => {
    route.actions?.forEach(action => {
      if (action.to) {
        actionTargets.add(action.to.replace(/:[^/]+/g, ':param'));
      }
    });
  });

  const registeredPaths = new Set(allRoutes.map(r => r.path.replace(/:[^/]+/g, ':param')));
  const missingTargets = Array.from(actionTargets).filter(t => !registeredPaths.has(t));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Route Audit" />
      
      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="p-4 max-w-4xl mx-auto space-y-6 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{allRoutes.length}</div>
                <div className="text-sm text-muted-foreground">Total Routes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-green-600">{enabledRoutes.length}</div>
                <div className="text-sm text-muted-foreground">Enabled</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{menuRoutes.length}</div>
                <div className="text-sm text-muted-foreground">In Menu</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{missingTargets.length}</div>
                <div className="text-sm text-muted-foreground">Missing Targets</div>
              </CardContent>
            </Card>
          </div>

          {missingTargets.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Missing Route Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These action button targets are not in the registry:
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingTargets.map(target => (
                    <Badge key={target} variant="outline" className="text-amber-600">
                      {target}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">All Registered Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allRoutes.map(route => (
                  <div 
                    key={route.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                    data-testid={`route-item-${route.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {route.enabled ? (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{route.label}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {route.type}
                          </Badge>
                          {route.showInMenu && (
                            <Badge className="text-xs shrink-0">menu</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {route.path}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {route.guard && (
                        <Badge variant="outline" className="text-xs">guarded</Badge>
                      )}
                      {route.actions && route.actions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {route.actions.length} actions
                        </Badge>
                      )}
                      {route.enabled && !route.path.includes(':') && (
                        <Link href={route.path}>
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Routes with Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routesWithActions.map(route => (
                  <div key={route.id} className="space-y-2">
                    <div className="font-medium">{route.label}</div>
                    <div className="flex flex-wrap gap-2">
                      {route.actions?.map(action => (
                        <Badge 
                          key={action.id} 
                          variant={action.to ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {action.label}
                          {action.to && ` → ${action.to}`}
                          {action.handler && ` (${action.handler})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Guarded Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {routesWithGuards.map(route => (
                  <div key={route.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <div>
                      <div className="font-medium">{route.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">{route.path}</div>
                    </div>
                    <div className="text-xs text-right">
                      {route.guard?.requiredData?.length ? (
                        <div>Requires: {route.guard.requiredData.join(', ')}</div>
                      ) : null}
                      {route.guard?.fallbackTo && (
                        <div className="text-muted-foreground">→ {route.guard.fallbackTo}</div>
                      )}
                      {route.guard?.fallbackHandler && (
                        <div className="text-muted-foreground">→ {route.guard.fallbackHandler}()</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
