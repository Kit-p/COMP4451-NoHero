import Phaser from 'phaser';

import PlayerCharacter from '../characters/PlayerCharacter';
import Character from '../classes/Character';

export default class GameScene extends Phaser.Scene {
    /** @type {{tilemap: Phaser.Tilemaps.Tilemap, layers: Phaser.Tilemaps.TilemapLayer[]}} */
    map = {
        tilemap: null,
        layers: [],
    };

    /** @type {Phaser.Physics.Arcade.Group} A group of game objects with physics. */
    physicsGroup;

    /** @type {Phaser.GameObjects.GameObject[]} Game objects for UI, no physics involved. */
    uiObjects = [];

    constructor() {
        super({
            key: 'scene_game',
            active: true,
            visible: true,
        });
    }

    init() {
        this.physicsGroup = this.physics.add.group();
        console.log(this);
    }

    preload() {
        this.load.image('tile_all-in-one-2', 'assets/tiles/all-in-one/2.png');
        this.load.tilemapTiledJSON('map_trial-1', 'assets/maps/trial-1.json');
        this.load.atlas(
            'atlas_all-in-one-2',
            'assets/tiles/all-in-one/2.png',
            'assets/tiles/atlases/tile_all-in-one-2.json'
        );
    }

    create() {
        const player = new PlayerCharacter(
            this,
            0,
            0,
            'atlas_all-in-one-2',
            'big_demon_idle_anim_f0',
            {
                name: 'big_demon',
                isHumanControlled: true,
                type: 'player',
            }
        );
        this.physicsGroup.add(player);

        const enemy = new PlayerCharacter(
            this,
            0,
            0,
            'atlas_all-in-one-2',
            'knight_m_idle_anim_f0',
            {
                name: 'knight_m',
                isHumanControlled: false,
                type: 'enemy',
            }
        );
        this.physicsGroup.add(enemy);

        // make each of the game objects collide with each other
        this.physics.add.collider(
            this.physicsGroup,
            this.physicsGroup,
            this._physicsObjectCollideCallback,
            undefined,
            this
        );

        // create the map for this scene
        this._createMap('map_trial-1', 'tile_all-in-one-2', 0, -6);

        // place the player at the top center of the map
        player.setX(this.map.tilemap.widthInPixels / 2);
        player.setY(this.map.tilemap.heightInPixels / 4 - player.height / 2);

        // place the enemy at the bottom center of the map
        enemy.setX(this.map.tilemap.widthInPixels / 2);
        enemy.setY(
            (this.map.tilemap.heightInPixels * 3) / 4 + enemy.height / 2
        );
    }

    update() {
        // update game objects with physics
        for (const physicsObject of this.physicsGroup.getChildren()) {
            physicsObject.update();
        }
        // update ui objects if they are active, remove from array otherwise
        for (let i = this.uiObjects.length - 1; i >= 0; --i) {
            if (this.uiObjects[i].active) {
                this.uiObjects[i].update();
            } else {
                this.uiObjects.splice(i, 1);
            }
        }
    }

    /**
     * A utility method to create a map and the layers, also handles adding collisions with game objects.
     * @param {string} tilemap The key of the tilemap.
     * @param {string} tileset The key of the tileset image for the tilemap.
     * @param {number} offsetX The x offset of each layer.
     * @param {number} offsetY The y offset of each layer.
     * @returns {Phaser.Tilemaps.Tilemap} The created map.
     */
    _createMap(tilemap, tileset, offsetX = 0, offsetY = 0) {
        const map = this.add.tilemap(tilemap);
        map.addTilesetImage(tileset);
        this.scale.setGameSize(map.widthInPixels, map.heightInPixels);
        this.physics.world.bounds.width = map.widthInPixels;
        this.physics.world.bounds.height = map.heightInPixels;
        let layerDepth = 0;
        for (const layerData of map.layers) {
            const layer = map.createLayer(
                layerData.name,
                tileset,
                offsetX,
                offsetY
            );
            // add layer for collision detection
            layer.setCollisionByProperty({ collides: true }, true);
            // set the depth according to the layer's order
            layer.setDepth(layerDepth);
            layerDepth += 10;
            // allow game objects to collide with layer
            for (const physicsObject of this.physicsGroup.getChildren()) {
                this.physics.add.collider(physicsObject, layer);
            }
            this.map.layers.push(layer);
        }
        // ensure all sprites are at least on top of the lowest layer
        for (const physicsObject of this.physicsGroup.getChildren()) {
            if (physicsObject instanceof Phaser.GameObjects.Sprite) {
                physicsObject.setDepth(this.map.layers[0].depth + 1);
            }
        }

        // ensure all ui objects are on top of all layers
        for (const uiObject of this.uiObjects) {
            if (uiObject instanceof Phaser.GameObjects.Sprite) {
                uiObject.setDepth(layerDepth + 1);
            }
        }
        this.map.tilemap = map;
        return map;
    }

    /**
     * A callback function used as ArcadePhysicsCallback.
     * Check the type of the colliding objects and call corresponding methods if necessary.
     * @type {ArcadePhysicsCallback}
     * @param {Phaser.Types.Physics.Arcade.GameObjectWithBody} object1
     * @param {Phaser.Types.Physics.Arcade.GameObjectWithBody} object2
     */
    _physicsObjectCollideCallback(object1, object2) {
        if (
            object1 instanceof PlayerCharacter &&
            object2 instanceof PlayerCharacter &&
            object1.type !== object2.type
        ) {
            if (object1.type !== 'player' && object2.type !== 'player') {
                // no player involved
                return;
            }
            let [player, enemy] = [object1, object2];
            if (player.type !== 'player') {
                [player, enemy] = [object2, object1];
            }
            player.collideAttacks(enemy);
        }
        if (object1 instanceof Character && object1.active) {
            object1.collidesWith(object2);
        }
        if (object2 instanceof Character && object2.active) {
            object2.collidesWith(object1);
        }
    }
}
