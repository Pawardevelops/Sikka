/**
 * Renders the top pushed v3 screen. Each screen reads what it needs by id
 * from the contexts, so routes never hold stale records.
 */
import React from 'react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { Route } from '../context/NavigationContext';

export function RouteScreen({ route }: { route: Route }): React.ReactElement | null {
    switch (route.name) {
        default:
            return null;
    }
}
