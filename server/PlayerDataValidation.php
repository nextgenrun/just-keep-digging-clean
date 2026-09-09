<?php
declare(strict_types=1);
namespace UnderstarData;
function fields(array $input, array $config, int $depth = 0): array {
    if ($depth > $config['maxFieldDepth'] || count($input) > $config['maxFieldCount'])
        throw new DataError('invalid_detail', 400);
    $clean = [];
    foreach ($input as $key => $value) {
        if (!in_array($key, $config['fields'], true)) throw new DataError('unknown_detail', 400);
        if (is_int($value) || is_float($value)) {
            if (!is_finite((float)$value)) throw new DataError('invalid_number', 400);
            $clean[$key] = $value;
        } elseif (is_bool($value)) $clean[$key] = $value;
        elseif (is_string($value) && strlen($value) <= $config['maxStringLength']
            && preg_match('~^[a-zA-Z0-9_.:/ -]*$~D', $value)) $clean[$key] = $value;
        elseif (is_array($value)) $clean[$key] = fields($value, $config, $depth + 1);
        else throw new DataError('invalid_detail', 400);
    }
    return $clean;
}
function validate(array $body, array $config): array {
    if (($body['schema'] ?? null) !== $config['schema']) throw new DataError('invalid_schema', 400);
    $id = uuid($body['id'] ?? null); $player = uuid($body['player'] ?? null);
    $created = $body['createdAt'] ?? null;
    if (!is_numeric($created) || $created < (microtime(true) * 1000 - $config['maxAgeMs'])
        || $created > (microtime(true) * 1000 + $config['futureClockMs'])) throw new DataError('expired_batch', 400);
    if (($body['kind'] ?? null) === 'events') {
        $session = uuid($body['session'] ?? null);
        $events = $body['events'] ?? null;
        if (!is_array($events) || !array_is_list($events) || !$events || count($events) > $config['maxEvents'])
            throw new DataError('invalid_events', 400);
        $previous = 0; $clean = [];
        foreach ($events as $event) {
            if (!is_array($event) || !is_int($event['seq'] ?? null) || $event['seq'] <= $previous
                || !is_numeric($event['elapsedMs'] ?? null) || $event['elapsedMs'] < 0
                || $event['elapsedMs'] > $config['maxSessionMs']
                || !preg_match('/^[a-z][a-z0-9_]{0,47}$/D', $event['type'] ?? '')
                || !preg_match('/^[a-zA-Z0-9_]{1,64}$/D', $event['scene'] ?? '')
                || !in_array($event['phase'] ?? '', ['loading', 'menu', 'gameplay', 'paused'], true))
                throw new DataError('invalid_event', 400);
            $previous = $event['seq'];
            $clean[] = ['seq' => $previous, 'elapsedMs' => $event['elapsedMs'], 'type' => $event['type'],
                'scene' => $event['scene'], 'phase' => $event['phase'], 'detail' => fields($event['detail'] ?? [], $config)];
        }
        $build = $body['build'] ?? '';
        if (!is_string($build) || !preg_match('/^[a-zA-Z0-9._-]{1,64}$/D', $build)) throw new DataError('invalid_build', 400);
        return ['path' => 'logs/' . $session . '/' . $id . '.json',
            'data' => ['id' => $id, 'kind' => 'events', 'player' => $player, 'session' => $session,
                'createdAt' => $created, 'startedAt' => is_numeric($body['startedAt'] ?? null) ? (float)$body['startedAt'] : $created, 'build' => $build,
                'dropped' => max(0, (int)($body['dropped'] ?? 0)), 'events' => $clean]];
    }
    if (($body['kind'] ?? null) === 'save') {
        $owner = owner($body, $config); $slot = $body['slot'] ?? null;
        if (!is_int($slot) || $slot < 1 || $slot > $config['maxSlot']) throw new DataError('invalid_slot', 400);
        $portable = $body['portableJson'] ?? null;
        if (!is_string($portable) || strlen($portable) > $config['maxSaveBytes']) throw new DataError('invalid_save', 400);
        $decoded = json_decode($portable, false, 128, JSON_THROW_ON_ERROR);
        if (($decoded->format ?? '') !== 'understar-save' || ($decoded->formatVersion ?? null) !== 1
            || ($decoded->slotId ?? null) !== $slot || !is_object($decoded->saveData ?? null)
            || !is_int($decoded->saveData->version ?? null) || ($decoded->saveData->version < 1)
            || ($decoded->saveData->version > 15) || !isset($decoded->saveData->world, $decoded->payloadChecksum))
            throw new DataError('invalid_save', 400);
        return ['path' => 'saves/' . $owner . '/' . $slot . '/' . $id . '.json',
            'data' => ['id' => $id, 'kind' => 'save', 'owner' => $owner, 'player' => $player,
                'createdAt' => $created, 'slot' => $slot, 'portableSha256' => hash('sha256', $portable), 'portableJson' => $portable]];
    }
    throw new DataError('invalid_kind', 400);
}
