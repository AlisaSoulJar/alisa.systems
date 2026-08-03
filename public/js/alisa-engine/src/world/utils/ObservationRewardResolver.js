/**
 * Browser-safe observe-to-render reward resolver.
 *
 * Mirrors the Node validation tool in tools/observation_reward_resolver.mjs,
 * but has no fs/path dependencies so the live Overworld can classify a clicked
 * filesystem building before opening EntityCard.
 */

function textOf(node = {}) {
    return `${node.id || ''} ${node.name || ''} ${node.path || ''} ${node.filesystemType || ''}`.toLowerCase();
}

function includesAny(haystack, needles) {
    return needles.some((needle) => haystack.includes(needle));
}

function makeAction(id, label, kind, requiresConsent = true, target = null) {
    return { id, label, kind, requiresConsent, target };
}

function basename(id = '') {
    const parts = String(id).split(/[/\\]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : id;
}

function classifyObservation(node = {}, context = {}) {
    const h = textOf(node);
    const role = node.spatialRole || context.spatialRole || 'room';

    if (context.isCore || includesAny(h, ['alisa_root'])) {
        return {
            roomArchetype: 'root_monolith',
            visualMotif: 'awake sovereign core with diagnostic crown lights',
            rewardIds: ['system_health_insight', 'agent_job', 'memory_crystal'],
            actions: [
                makeAction('hub.health', 'Check Hub health', 'hub_route', false, '/health'),
                makeAction('system.inspect_readonly', 'Inspect system state', 'hub_route', false, '/system'),
            ],
            why: 'The root node is the civic center: observe health first, then delegate work deliberately.',
        };
    }

    if (includesAny(h, ['akasha', 'memory', 'memoria', 'korin', 'warpdrive', 'memoryweaver', 'lecciones', 'lessons', 'papers', 'knowledge'])) {
        return {
            roomArchetype: 'memory_archive',
            visualMotif: 'archive tower with crystal cabinets and search lamps',
            rewardIds: ['memory_crystal', 'useful_tool', 'agent_job'],
            actions: [
                makeAction('akasha.search_here', 'Search canon here', 'hub_route', false, '/do/akasha-search'),
                makeAction('korin.vectorize_here', 'Ask Korin to vectorize this floor', 'being_job', true, 'Korin'),
            ],
            why: 'Memory/canon spaces should reveal recall crystals first and offer vector work only with consent.',
        };
    }

    if (includesAny(h, ['soma', 'navi', 'hub', 'monk', 'motoko', 'cochlea', 'ouroboros', 'xtts', 'cdp', 'vision'])) {
        return {
            roomArchetype: 'sensory_control_room',
            visualMotif: 'control deck with ears, eyes, browser periscopes, and live service gauges',
            rewardIds: ['system_health_insight', 'useful_tool', 'agent_job'],
            actions: [
                makeAction('hub.health', 'Check Hub health', 'hub_route', false, '/health'),
                makeAction('monk.status', 'Check vision/browser control', 'hub_route', false, '/monk/status'),
                makeAction('metatron.decree', 'Ask Metatron for a bounded decree', 'being_job', true, 'Metatron'),
            ],
            why: 'Embodied/sensory systems should expose status and safe control affordances.',
        };
    }

    if (includesAny(h, ['world', 'overworld', 'irealworld', 'alisa-engine', 'engine', 'systems', 'factories', 'plugins', 'cartographer'])) {
        return {
            roomArchetype: 'engine_workshop',
            visualMotif: 'procedural workshop with navmesh tables, city seeds, and running simulation panels',
            rewardIds: ['mini_game', 'hero_render', 'agent_job', 'system_health_insight'],
            actions: [
                makeAction('cartographer.inspect', 'Inspect spatial state', 'hub_route', false, '/overworld/state'),
                makeAction('probe.smoke', 'Ask Probe for a visual smoke test', 'being_job', true, 'Probe'),
            ],
            why: 'Engine spaces are where play, simulation, testing, and visible system truth converge.',
        };
    }

    if (includesAny(h, ['program files', 'steam', 'vscode', 'visual studio code', 'chrome', 'edge', 'firefox', 'adobe', 'office', 'blender', 'ollama'])) {
        return {
            roomArchetype: 'commercial_hero_room',
            visualMotif: 'premium branded room with a launch console and consent-gated portal surfaces',
            rewardIds: ['hero_render', 'commercial_surface', 'useful_tool'],
            actions: [
                makeAction('hero.open_app', 'Open or focus the real app', 'desktop_action', true, node.id || node.name || null),
                makeAction('commerce.inspect_surface', 'Inspect hero/commercial surface', 'local_contract', true, 'observation_reward_commerce_manifest'),
            ],
            why: 'Commercial tools can become hero rooms, but launch/commerce actions need consent.',
        };
    }

    if (includesAny(h, ['windows', 'system32', 'drivers', 'appdata', '$recycle.bin'])) {
        return {
            roomArchetype: 'restricted_core',
            visualMotif: 'sealed infrastructure core with warning lights and read-only diagnostic glass',
            rewardIds: ['system_health_insight'],
            actions: [
                makeAction('system.inspect_readonly', 'Inspect read-only health', 'hub_route', false, '/system'),
            ],
            why: 'Sensitive OS areas should be diagnostic by default, not playful mutation zones.',
        };
    }

    if (role === 'district' || role === 'building' || role === 'floor' || node.id) {
        return {
            roomArchetype: 'discovery_chest',
            visualMotif: 'sealed floor chest that reveals useful local context on observation',
            rewardIds: ['system_health_insight', 'memory_crystal', 'useful_tool'],
            actions: [
                makeAction('filesystem.peek', 'Peek bounded folder anatomy', 'hub_route', false, '/system/filesystem'),
                makeAction('jobboard.offer_cleanup', 'Offer cleanup or indexing job', 'being_job', true, 'JobBoard'),
            ],
            why: 'Unknown places should reveal safe context first, then propose reversible work.',
        };
    }

    return {
        roomArchetype: 'drawer_or_prop',
        visualMotif: 'small prop drawer with metadata and no heavy scan',
        rewardIds: ['memory_crystal'],
        actions: [
            makeAction('metadata.inspect', 'Inspect metadata', 'local_contract', false, node.id || node.name || null),
        ],
        why: 'Leaf-like observations should stay cheap and informational.',
    };
}

export function resolveObservationReward(node = {}, context = {}) {
    const classification = classifyObservation(node, context);
    return {
        node: {
            id: node.id || node.path || node.name,
            name: node.name || basename(node.id || ''),
            filesystemType: node.filesystemType || node.type || 'unknown',
            spatialRole: node.spatialRole || context.spatialRole || 'building',
            depth: node.depth ?? null,
            domain: node.domain || 'node_city',
        },
        ...classification,
    };
}

export default resolveObservationReward;
