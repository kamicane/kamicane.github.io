/* compiled with quickstart@1.1.4 */(function (main, modules) {
  'use strict';
  var cache = require.cache = {};
  function require(id) {
    var module = cache[id];
    if (!module) {
      var moduleFn = modules[id];
      if (!moduleFn)
        throw new Error('module ' + id + ' not found');
      module = cache[id] = {};
      var exports = module.exports = {};
      moduleFn.call(exports, require, module, exports, window);
    }
    return module.exports;
  }
  require.resolve = function (resolved) {
    return resolved;
  };
  require.node = function () {
    return {};
  };
  require(main);
}('./lib/index-global.js', {
  './lib/index-global.js': function (require, module, exports, global) {
    'use strict';
    window.particular = require('./lib/index.js');
  },
  './lib/index.js': function (require, module, exports, global) {
    'use strict';
    exports.Cloud = require('./lib/cloud.js');
    exports.Material = require('./lib/material.js');
    exports.Point = require('./lib/point.js');
    exports.Mesh = require('./lib/mesh.js');
    exports.Gradient = require('./lib/gradient.js');
    var forces = require('./lib/forces.js');
    var constraints = require('./lib/constraints.js');
    var random = require('./lib/random.js');
    var zone = require('./lib/zone.js');
    var key;
    for (key in forces)
      exports[key] = forces[key];
    for (key in random)
      exports[key] = random[key];
    for (key in zone)
      exports[key] = zone[key];
    for (key in constraints)
      exports[key] = constraints[key];
  },
  './lib/point.js': function (require, module, exports, global) {
    'use strict';
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    function Point(params) {
      if (!params)
        params = {};
      if (!this.position)
        this.position = new THREE.Vector3();
      if (params.position)
        this.position.copy(params.position);
      this.previous = new THREE.Vector3().copy(this.position);
      this.velocity = new THREE.Vector3();
      this.acceleration = params.acceleration != null ? params.acceleration : new THREE.Vector3();
      this.damping = params.damping != null ? params.damping : 0;
      this.radius = params.radius != null ? params.radius : 0;
      this.mass = params.mass != null ? params.mass : 1;
    }
    createClass(null, Point, {
      update: function updatePoint(delta) {
        var acceleration = this.acceleration;
        var previous = this.previous;
        var position = this.position;
        var velocity = this.velocity;
        var drag = 1 - this.damping;
        var accelerators = this.accelerators;
        var colliders = this.colliders;
        var i, l, force, collider;
        if (accelerators)
          for (i = 0, l = accelerators.length; i < l; i++) {
            force = accelerators[i];
            acceleration.add(force.valueOf(this));
          }
        velocity.subVectors(position, previous);
        velocity.add(acceleration.multiplyScalar(delta * delta));
        previous.copy(position);
        position.add(velocity.multiplyScalar(drag));
        acceleration.set(0, 0, 0);
        if (colliders)
          for (i = 0, l = colliders.length; i < l; i++) {
            collider = colliders[i];
            collider.apply(this);
          }
        return this;
      },
      teleport: function (position) {
        this.position.copy(position);
        this.previous.copy(position);
        return this;
      },
      accelerate: function (force) {
        this.acceleration.add(force.valueOf(this));
        return this;
      },
      impulse: function (force) {
        this.position.add(force.valueOf(this));
        return this;
      }
    });
    module.exports = Point;
  },
  './lib/cloud.js': function (require, module, exports, global) {
    'use strict';
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    var rgb = require('./node_modules/rgb/index.js');
    var Particle = require('./lib/particle.js');
    var Gradient = require('./lib/gradient.js');
    var util = require('./lib/util.js');
    var isString = util.isString;
    var isArray = util.isArray;
    function Cloud(material, params) {
      var geometry = new THREE.Geometry();
      THREE.PointCloud.call(this, geometry, material);
      this.length = params.length;
      this.particlePosition = params.position || new THREE.Vector3();
      this.particleDamping = params.damping != null ? params.damping : 0;
      this.particleMass = params.mass != null ? params.mass : 1;
      var color = params.color;
      if (isString(color)) {
        color = new THREE.Vector4().fromArray(rgb(color, true).map(function (c, j) {
          return j === 3 ? c : c / 255;
        }));
      } else if (isArray(color)) {
        color = new Gradient().fromColors(color);
      }
      this.particleColor = color || new THREE.Vector4(1, 0, 0, 1);
      this.particleSize = params.size || 64;
      this.particleLife = params.life || 0;
      this.particleAngle = params.angle || 0;
      this.dynamic = true;
      material.attributes = {
        alive: {
          type: 'f',
          value: []
        },
        size: {
          type: 'f',
          value: []
        },
        angle: {
          type: 'f',
          value: []
        },
        color: {
          type: 'v4',
          value: []
        }
      };
      var vertices = geometry.vertices = new Array(this.length);
      this.particles = new Array(this.length);
      var pool = this.pool = [];
      this.alive = [];
      this.colliders = [];
      this.accelerators = [];
      this.impulses = [];
      for (var i = 0, l = this.length; i < l; i++) {
        var particle = new Particle(this, i);
        vertices[i] = particle.position;
        pool[i] = this.particles[i] = particle;
        material.attributes.alive.value[i] = 0;
        material.attributes.size.value[i] = 0;
        material.attributes.angle.value[i] = 0;
        material.attributes.color.value[i] = particle.color;
      }
      this.origin = this.position;
      this.age = 0;
    }
    createClass(THREE.PointCloud, Cloud, {
      addCollider: function (collider) {
        var colliders = this.colliders;
        var io = colliders.indexOf(collider);
        if (io === -1)
          this.colliders.push(collider);
        return this;
      },
      removeCollider: function (collider) {
        var colliders = this.colliders;
        var io = colliders.indexOf(collider);
        if (io > -1)
          colliders.splice(io, 1);
        return this;
      },
      addImpulse: function (accelerator) {
        this.impulses.push(accelerator);
        return this;
      },
      removeImpulse: function (accelerator) {
        var impulses = this.impulses;
        var io = impulses.indexOf(accelerator);
        if (io > -1)
          impulses.splice(io, 1);
        return this;
      },
      addAccelerator: function (accelerator) {
        this.accelerators.push(accelerator);
        return this;
      },
      removeAccelerator: function (accelerator) {
        var accelerators = this.accelerators;
        var io = accelerators.indexOf(accelerator);
        if (io > -1)
          accelerators.splice(io, 1);
        return this;
      },
      emit: function (num) {
        if (num > this.pool.length)
          num = this.pool.length;
        var particle, i, j, l;
        var impulses = this.impulses;
        var alive = this.alive;
        for (i = 0; i < num; i++) {
          particle = this.pool.shift();
          alive.push(particle.initialize());
          for (j = 0, l = impulses.length; j < l; j++) {
            particle.impulse(impulses[j]);
          }
        }
        return this;
      },
      accelerate: function (force) {
        var alive = this.alive, particle, i, l;
        for (i = 0, l = alive.length; i < l; i++) {
          particle = alive[i];
          particle.accelerate(force);
        }
        return this;
      },
      emitMax: function () {
        return this.emit(this.pool.length);
      },
      update: function updateCloud(delta) {
        this.age += delta;
        var pool = this.pool;
        var count = this.length - pool.length;
        if (count === 0)
          return this;
        var alive = this.alive;
        var attributes = this.material.attributes;
        var sizes = attributes.size.value, angles = attributes.angle.value, lives = attributes.alive.value;
        var i, index, particle;
        for (i = alive.length; i--; i) {
          particle = alive[i];
          index = particle.index;
          if (particle.life && particle.age >= particle.life) {
            pool.push(particle);
            alive.splice(i, 1);
            lives[index] = 0;
          } else {
            particle.update(delta);
            lives[index] = 1;
          }
          sizes[index] = particle.size;
          angles[index] = particle.angle;
        }
        attributes.alive.needsUpdate = true;
        attributes.color.needsUpdate = true;
        attributes.size.needsUpdate = true;
        attributes.angle.needsUpdate = true;
        this.geometry.verticesNeedUpdate = true;
        return this;
      }
    });
    module.exports = Cloud;
  },
  './lib/material.js': function (require, module, exports, global) {
    'use strict';
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    var pick = require('./lib/util.js').pick;
    var vertexShader = require('./lib/particular.vert');
    var fragmentShader = require('./lib/particular.frag');
    function Material(params) {
      THREE.ShaderMaterial.call(this);
      this.fragmentShader = fragmentShader;
      this.vertexShader = vertexShader;
      this.uniforms = THREE.UniformsUtils.merge([
        THREE.UniformsLib.lights,
        THREE.UniformsLib.fog,
        THREE.UniformsLib.shadowmap
      ]);
      if (params.lights) {
        this.vertexShader = '#define USE_LIGHTS\n' + this.vertexShader;
        this.lights = true;
      }
      if (params.map) {
        this.uniforms.map = {
          type: 't',
          value: params.map
        };
        this.fragmentShader = '#define USE_MAP\n' + this.fragmentShader;
        this.map = params.map;
      }
      this.uniforms.scale = {
        type: 'f',
        value: params.scale || window.innerHeight / 2
      };
      this.blending = pick(params.blending, THREE.AdditiveBlending);
      this.transparent = pick(params.transparent, true);
      this.alphaTest = pick(params.alphaTest, null);
      this.depthWrite = pick(params.depthWrite, false);
      this.depthTest = pick(params.depthTest, true);
      this.sizeAttenuation = pick(params.sizeAttenuation, true);
      this.fog = pick(params.fog, true);
    }
    module.exports = createClass(THREE.ShaderMaterial, Material, {});
  },
  './lib/mesh.js': function (require, module, exports, global) {
    'use strict';
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    var Point = require('./lib/point.js');
    function Mesh(geometry, material) {
      THREE.Mesh.call(this, geometry, material);
      Point.call(this);
      this.accelerators = [];
      this.colliders = [];
    }
    createClass(THREE.Mesh, Mesh, {
      update: Point.prototype.update,
      accelerate: Point.prototype.accelerate
    });
    module.exports = Mesh;
  },
  './lib/gradient.js': function (require, module, exports, global) {
    'use strict';
    var rgb = require('./node_modules/rgb/index.js');
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    var isString = require('./lib/util.js').isString;
    var convertToPct = function (c, i) {
      return i === 3 ? c : c / 255;
    };
    var colorToVector4 = function (color) {
      if (isString(color)) {
        return new THREE.Vector4().fromArray(rgb(color, true).map(convertToPct));
      } else if (color instanceof THREE.Color) {
        return new THREE.Vector4(color.r, color.g, color.b);
      }
      return color;
    };
    function Gradient(colorStops) {
      this.gradient = [];
      this.color = new THREE.Vector4();
      if (colorStops != null)
        this.fromColorStops(colorStops);
    }
    createClass(null, Gradient, {
      fromColors: function (colors) {
        this.gradient.splice(0, this.gradient.length);
        var length = colors.length;
        for (var i = 0; i < length; i++) {
          var color = colors[i], stop = i * length - 1;
          this.gradient[i] = {
            stop: stop,
            color: colorToVector4(color)
          };
        }
        return this;
      },
      fromColorStops: function (colorStops) {
        this.gradient.splice(0, this.gradient.length);
        for (var i = 0; i < colorStops.length; i++) {
          var item = colorStops[i];
          this.gradient[i] = {
            stop: item.stop,
            color: colorToVector4(item.color)
          };
        }
        return this;
      },
      addColorStop: function (stop, color) {
        this.gradient.push({
          stop: stop,
          color: colorToVector4(color)
        });
        return this;
      },
      valueOf: function solveGradient(factor) {
        var gradient = this.gradient;
        if (gradient.length === 1 || factor == null || factor <= 0)
          return this.color.copy(gradient[0].color);
        if (factor >= 1)
          return this.color.copy(gradient[gradient.length - 1].color);
        var c0, c1, color0, color1, stop0, stop1;
        for (var i = 0; i < gradient.length; i++) {
          c0 = gradient[i];
          c1 = gradient[i + 1];
          color0 = c0.color.valueOf();
          color1 = c1.color.valueOf();
          stop0 = c0.stop.valueOf();
          stop1 = c1.stop.valueOf();
          if (factor >= stop0 && factor <= stop1)
            break;
        }
        var f = (factor - stop0) / (stop1 - stop0);
        return this.color.copy(color0).lerp(color1, f);
      }
    });
    module.exports = Gradient;
  },
  './lib/forces.js': function (require, module, exports, global) {
    'use strict';
    function DirectionalForce(direction, magnitude) {
      this.direction = direction;
      this.magnitude = magnitude;
      this.force = new THREE.Vector3();
    }
    DirectionalForce.prototype.valueOf = function () {
      return this.force.copy(this.direction.valueOf()).normalize().multiplyScalar(this.magnitude.valueOf());
    };
    function Gravity(position, magnitude) {
      this.position = position;
      this.magnitude = magnitude;
      this.force = new THREE.Vector3();
    }
    Gravity.prototype.valueOf = function (point) {
      var dir = this.force.subVectors(point.position, this.position);
      var distanceSq = dir.lengthSq();
      var direction = dir.normalize();
      return direction.multiplyScalar(-this.magnitude / distanceSq);
    };
    function RadialForce(position, magnitude) {
      this.position = position;
      this.magnitude = magnitude;
      this.force = new THREE.Vector3();
    }
    RadialForce.prototype.valueOf = function (point) {
      var direction = this.force.subVectors(point.position, this.position).normalize();
      return direction.multiplyScalar(this.magnitude.valueOf());
    };
    function TangentialForce(position, axis, magnitude) {
      this.position = position;
      this.axis = axis;
      this.magnitude = magnitude;
      this.force = new THREE.Vector3();
    }
    TangentialForce.prototype.valueOf = function (point) {
      var dir = this.force.subVectors(this.position, point.position);
      var direction = dir.cross(this.axis).normalize();
      return direction.multiplyScalar(this.magnitude.valueOf());
    };
    function OrbitalForce(position, north, magnitude) {
      this.position = position;
      this.north = north;
      this.magnitude = magnitude;
      this.force = new THREE.Vector3();
    }
    OrbitalForce.prototype.valueOf = function (point) {
      var u = this.force.subVectors(this.position, point.position).normalize();
      var v = this.north.valueOf();
      var dt = v.dot(u) / u.dot(u);
      return this.force.subVectors(v, u.multiplyScalar(dt)).normalize().multiplyScalar(this.magnitude.valueOf());
    };
    exports.DirectionalForce = DirectionalForce;
    exports.RadialForce = RadialForce;
    exports.TangentialForce = TangentialForce;
    exports.OrbitalForce = OrbitalForce;
    exports.Gravity = Gravity;
  },
  './lib/constraints.js': function (require, module, exports, global) {
    'use strict';
    var tmp1 = new THREE.Vector3();
    function SphereConstraint(center, radius, stiffness) {
      this.center = center;
      this.radius = radius;
      this.stiffness = stiffness;
    }
    SphereConstraint.prototype.apply = function (point) {
      var center = this.center, radius = this.radius;
      var delta = tmp1.subVectors(point.position, center);
      var len = delta.length();
      if (len < radius) {
        var ratio = (len - radius) / len;
        delta.multiplyScalar(this.stiffness * ratio);
        point.position.sub(delta);
      }
    };
    exports.SphereConstraint = SphereConstraint;
  },
  './lib/zone.js': function (require, module, exports, global) {
    'use strict';
    var randFloat = require('./lib/util.js').randFloat;
    function SphereSurfaceZone(radius) {
      this.radius = radius;
      this.point = new THREE.Vector3();
    }
    SphereSurfaceZone.prototype.valueOf = function () {
      var theta = 2 * Math.PI * Math.random();
      var phi = Math.acos(2 * Math.random() - 1);
      var radius = this.radius;
      return this.point.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
    };
    function CircumferenceZone(radius) {
      this.radius = radius;
      this.point = new THREE.Vector3();
    }
    CircumferenceZone.prototype.valueOf = function () {
      var theta = Math.PI * 2 * Math.random();
      var radius = this.radius;
      return this.point.set(Math.cos(theta) * radius, Math.sin(theta) * radius, 0);
    };
    function BoxZone(width, height, depth) {
      this.width = width;
      this.height = height;
      this.depth = depth || 0;
      this.point = new THREE.Vector3();
    }
    BoxZone.prototype.valueOf = function () {
      var w2 = this.width / 2;
      var h2 = this.height / 2;
      var d2 = this.depth / 2;
      return this.point.set(randFloat(-w2, +w2), randFloat(-h2, +h2), randFloat(-d2, +d2));
    };
    exports.SphereSurfaceZone = SphereSurfaceZone;
    exports.CircumferenceZone = CircumferenceZone;
    exports.BoxZone = BoxZone;
  },
  './lib/random.js': function (require, module, exports, global) {
    'use strict';
    var util = require('./lib/util.js');
    var randInt = util.randInt;
    var randFloat = util.randFloat;
    function RandomInt(min, max) {
      this.min = min;
      this.max = max;
    }
    RandomInt.prototype.valueOf = function () {
      return randInt(this.min, this.max);
    };
    function RandomFloat(min, max) {
      this.min = min;
      this.max = max;
    }
    RandomFloat.prototype.valueOf = function () {
      return randFloat(this.min, this.max);
    };
    function RandomPick(values) {
      this.values = values;
    }
    RandomPick.prototype.valueOf = function () {
      return this.values[randInt(0, this.values.length - 1)];
    };
    function Vector3Between(xa, ya, za, xb, yb, zb) {
      this.vector3 = new THREE.Vector3();
      this.v3a = new THREE.Vector3(xa, ya, za);
      this.v3b = new THREE.Vector3(xb, yb, zb);
    }
    Vector3Between.prototype.valueOf = function () {
      var v3a = this.v3a;
      var v3b = this.v3b;
      return this.vector3.set(randFloat(v3a.x, v3b.x), randFloat(v3a.y, v3b.y), randFloat(v3a.z, v3b.z));
    };
    function Vector4Between(xa, ya, za, wa, xb, yb, zb, wb) {
      this.vector4 = new THREE.Vector4();
      this.v4a = new THREE.Vector4(xa, ya, za, wa);
      this.v4b = new THREE.Vector4(xb, yb, zb, wb);
    }
    Vector4Between.prototype.valueOf = function () {
      var v4a = this.v4a;
      var v4b = this.v4b;
      return this.vector4.set(randFloat(v4a.x, v4b.x), randFloat(v4a.y, v4b.y), randFloat(v4a.z, v4b.z), randFloat(v4a.w, v4b.w));
    };
    exports.RandomInt = RandomInt;
    exports.RandomFloat = RandomFloat;
    exports.RandomPick = RandomPick;
    exports.Vector3Between = Vector3Between;
    exports.Vector4Between = Vector4Between;
  },
  './lib/util.js': function (require, module, exports, global) {
    'use strict';
    exports.randFloat = function (min, max) {
      return min + (max - min) * Math.random();
    };
    exports.randInt = function (min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    };
    var toString = Object.prototype.toString;
    exports.isFunction = function (object) {
      return toString.call(object) === '[object Function]';
    };
    exports.isArray = function (object) {
      return toString.call(object) === '[object Array]';
    };
    exports.isString = function (object) {
      return toString.call(object) === '[object String]';
    };
    exports.isNumber = function (object) {
      return toString.call(object) === '[object Number]';
    };
    exports.pick = function (value1, value2) {
      return value1 != null ? value1 : value2;
    };
  },
  './lib/particle.js': function (require, module, exports, global) {
    'use strict';
    var createClass = require('./node_modules/es6-util/class/create.js').default;
    var Point = require('./lib/point.js');
    function Particle(parent, index) {
      Point.call(this);
      this.parent = parent;
      this.index = index;
      this.color = new THREE.Vector4();
      this.accelerators = parent.accelerators;
      this.colliders = parent.colliders;
    }
    createClass(Point, Particle, {
      initialize: function initializeParticle() {
        var parent = this.parent;
        var origin = parent.origin;
        this.position.copy(parent.particlePosition.valueOf()).add(origin);
        this.previous.copy(this.position);
        this.age = 0;
        this.life = this.parent.particleLife.valueOf();
        this.color.copy(parent.particleColor.valueOf(0));
        this.size = parent.particleSize.valueOf(0);
        this.angle = parent.particleAngle.valueOf(0);
        this.damping = parent.particleDamping.valueOf();
        this.mass = parent.particleMass.valueOf();
        return this;
      },
      update: function updateParticle(delta) {
        Point.prototype.update.call(this, delta);
        var parent = this.parent;
        this.age += delta;
        if (this.life) {
          var factor = this.age / this.life;
          if (factor > 1)
            factor = 1;
          if (factor < 0)
            factor = 0;
          this.color.copy(parent.particleColor.valueOf(factor));
          this.size = parent.particleSize.valueOf(factor);
          this.angle = parent.particleAngle.valueOf(factor);
        }
        return this;
      }
    });
    module.exports = Particle;
  },
  './lib/particular.vert': function (require, module, exports, global) {
    module.exports = '// The bastard child of lambert and particle_basic materials\r\n// This is mostly a hackjob, basically a pointcloud material with lights.\r\n\r\nuniform float delta;\r\nuniform float scale;\r\n\r\nattribute float alive;\r\nattribute float size;\r\nattribute float angle;\r\n\r\nattribute vec4 color;\r\n\r\nvarying float vAngle;\r\nvarying float vAlive;\r\nvarying vec4 vColor;\r\nvarying vec3 vLight;\r\n\r\n#ifdef USE_LIGHTS\r\n\r\n  #if MAX_DIR_LIGHTS > 0\r\n\r\n    uniform vec3 directionalLightColor[MAX_DIR_LIGHTS];\r\n    uniform vec3 directionalLightDirection[MAX_DIR_LIGHTS];\r\n\r\n  #endif\r\n\r\n  #if MAX_POINT_LIGHTS > 0\r\n\r\n    uniform vec3 pointLightColor[MAX_POINT_LIGHTS];\r\n    uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];\r\n    uniform float pointLightDistance[MAX_POINT_LIGHTS];\r\n    uniform float pointLightDecay[MAX_POINT_LIGHTS];\r\n\r\n  #endif\r\n\r\n  #if MAX_HEMI_LIGHTS > 0\r\n\r\n    uniform vec3 hemisphereLightSkyColor[MAX_HEMI_LIGHTS];\r\n    uniform vec3 hemisphereLightGroundColor[MAX_HEMI_LIGHTS];\r\n    uniform vec3 hemisphereLightDirection[MAX_HEMI_LIGHTS];\r\n\r\n  #endif\r\n\r\n  #if MAX_SPOT_LIGHTS > 0\r\n\r\n    uniform vec3 spotLightColor[MAX_SPOT_LIGHTS];\r\n    uniform vec3 spotLightPosition[MAX_SPOT_LIGHTS];\r\n    uniform vec3 spotLightDirection[MAX_SPOT_LIGHTS];\r\n    uniform float spotLightDistance[MAX_SPOT_LIGHTS];\r\n    uniform float spotLightAngleCos[MAX_SPOT_LIGHTS];\r\n    uniform float spotLightExponent[MAX_SPOT_LIGHTS];\r\n    uniform float spotLightDecay[MAX_SPOT_LIGHTS];\r\n\r\n  #endif\r\n\r\n  uniform vec3 ambientLightColor;\r\n\r\n#endif\r\n\r\n#ifdef USE_SHADOWMAP\r\n\r\n  varying vec4 vShadowCoord[MAX_SHADOWS];\r\n  uniform mat4 shadowMatrix[MAX_SHADOWS];\r\n\r\n#endif\r\n\r\nfloat saturate(in float a) {\r\n  return clamp( a, 0.0, 1.0 );\r\n}\r\n\r\nfloat calcLightAttenuation(float lightDistance, float cutoffDistance, float decayExponent) {\r\n  if (decayExponent > 0.0) {\r\n    return pow(saturate(1.0 - lightDistance / cutoffDistance), decayExponent);\r\n  }\r\n  return 1.0;\r\n}\r\n\r\nvoid main() {\r\n  if (alive == 0.0) return; // i suppose this prevents it from being rendered.\r\n\r\n  vAngle = angle;\r\n  vAlive = alive;\r\n  vColor = color;\r\n\r\n  vLight = vec3(0.0);\r\n\r\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\r\n\r\n  vec4 worldPosition = modelMatrix * vec4(position, 1.0);\r\n\r\n  #ifdef USE_LIGHTS\r\n\r\n    #if MAX_DIR_LIGHTS > 0\r\n\r\n      for (int i = 0; i < MAX_DIR_LIGHTS; i++) {\r\n        vLight += directionalLightColor[i];\r\n      }\r\n\r\n    #endif\r\n\r\n    #if MAX_POINT_LIGHTS > 0\r\n\r\n      for (int i = 0; i < MAX_POINT_LIGHTS; i++) {\r\n        vec4 lPosition = viewMatrix * vec4( pointLightPosition[i], 1.0);\r\n        vec3 lVector = lPosition.xyz - mvPosition.xyz;\r\n        float attenuation = calcLightAttenuation(length(lVector), pointLightDistance[i], pointLightDecay[i]);\r\n        vLight += pointLightColor[i] * attenuation;\r\n      }\r\n\r\n    #endif\r\n\r\n    #if MAX_SPOT_LIGHTS > 0\r\n\r\n      for (int i = 0; i < MAX_SPOT_LIGHTS; i++) {\r\n        vec4 lPosition = viewMatrix * vec4( spotLightPosition[i], 1.0);\r\n        vec3 lVector = lPosition.xyz - mvPosition.xyz;\r\n        float spotEffect = dot( spotLightDirection[i], normalize(spotLightPosition[i] - worldPosition.xyz));\r\n        if (spotEffect > spotLightAngleCos[i]) {\r\n          spotEffect = max(pow(max(spotEffect, 0.0), spotLightExponent[i] ), 0.0);\r\n          float attenuation = calcLightAttenuation(length(lVector), spotLightDistance[i], spotLightDecay[i]);\r\n          vLightFront += spotLightColor[i] * attenuation * spotEffect;\r\n        }\r\n      }\r\n\r\n    #endif\r\n\r\n    #if MAX_HEMI_LIGHTS > 0\r\n\r\n      for(int i = 0; i < MAX_HEMI_LIGHTS; i++) {\r\n        vLight += mix(hemisphereLightGroundColor[i], hemisphereLightSkyColor[i], 1.0);\r\n      }\r\n\r\n    #endif\r\n\r\n    vLight += ambientLightColor;\r\n\r\n  #endif\r\n\r\n  #ifdef USE_SIZEATTENUATION\r\n\r\n    // gl_PointSize = size * (300.0 / length(mvPosition.xyz)); // scale particles as objects in 3D space\r\n    // gl_PointSize = size * (300.0 / length(mvPosition.xyz));\r\n    gl_PointSize = size * ( scale / length( mvPosition.xyz ) );\r\n\r\n  #else\r\n\r\n    gl_PointSize = size;\r\n\r\n  #endif\r\n\r\n  gl_Position = projectionMatrix * mvPosition;\r\n\r\n  #ifdef USE_SHADOWMAP\r\n\r\n    for(int i = 0; i < MAX_SHADOWS; i++) {\r\n      vShadowCoord[i] = shadowMatrix[i] * worldPosition;\r\n    }\r\n\r\n  #endif\r\n\r\n}\r\n';
  },
  './lib/particular.frag': function (require, module, exports, global) {
    module.exports = '// The bastard child of lambert and particle_basic materials\r\n// This is mostly a hackjob, basically a pointcloud material with lights.\r\n\r\n#define LOG2 1.442695\r\n\r\n#ifdef USE_MAP\r\n  uniform sampler2D map;\r\n#endif\r\n\r\nvarying float vAlive;\r\nvarying float vAngle;\r\nvarying vec4 vColor;\r\nvarying vec3 vLight;\r\n\r\n#ifdef USE_FOG\r\n\r\n  uniform vec3 fogColor;\r\n\r\n  #ifdef FOG_EXP2\r\n\r\n    uniform float fogDensity;\r\n\r\n  #else\r\n\r\n    uniform float fogNear;\r\n    uniform float fogFar;\r\n  #endif\r\n\r\n#endif\r\n\r\n#ifdef USE_SHADOWMAP\r\n\r\n  uniform sampler2D shadowMap[MAX_SHADOWS];\r\n  uniform vec2 shadowMapSize[MAX_SHADOWS];\r\n\r\n  uniform float shadowDarkness[MAX_SHADOWS];\r\n  uniform float shadowBias[MAX_SHADOWS];\r\n\r\n  varying vec4 vShadowCoord[MAX_SHADOWS];\r\n\r\n#endif\r\n\r\nfloat square(in float a) {\r\n  return a * a;\r\n}\r\n\r\nfloat unpackDepth(const in vec4 rgba_depth) {\r\n  const vec4 bit_shift = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);\r\n  float depth = dot(rgba_depth, bit_shift);\r\n  return depth;\r\n}\r\n\r\nfloat saturate(in float a) {\r\n  return clamp(a, 0.0, 1.0);\r\n}\r\n\r\nfloat whiteCompliment(in float a) {\r\n  return saturate(1.0 - a);\r\n}\r\n\r\nvoid main() {\r\n  if (vAlive == 0.0) return; // i suppose this prevents it from being rendered.\r\n\r\n  vec4 color = vColor;\r\n  vec3 light = vLight;\r\n\r\n  #ifdef USE_MAP\r\n\r\n    color *= texture2D(map, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y)); // BASE USE THIS\r\n\r\n    // float c = cos(vAngle);\r\n    // float s = sin(vAngle);\r\n\r\n    // vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,\r\n    //                       c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);\r\n\r\n    // vec4 rotatedTexture = texture2D(map, rotatedUV);\r\n\r\n    // color *= rotatedTexture;\r\n\r\n    // vec4 diffuse = texture2D(map, mod(vUv + uvOffset, 1.0));\r\n    // gl_FragColor = diffuse;\r\n\r\n    // color *= texture2D( map, mod( vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) + vec2(0.5, 0.5), 1.0 ) );\r\n    // color *= texture2D(map, mod(vec2(0.2, 0.2) + vec2(0.1, 0.1), 1.0));\r\n\r\n  #endif\r\n\r\n  #ifdef ALPHATEST\r\n\r\n    if (color.a < ALPHATEST) discard;\r\n\r\n  #endif\r\n\r\n  light *= color.rgb;\r\n\r\n  #ifdef USE_SHADOWMAP\r\n\r\n    float fDepth;\r\n    vec3 shadowColor = vec3(1.0);\r\n\r\n    for (int i = 0; i < MAX_SHADOWS; i++) {\r\n\r\n      vec3 shadowCoord = vShadowCoord[i].xyz / vShadowCoord[i].w;\r\n\r\n      // if (something && something) breaks ATI OpenGL shader compiler\r\n      // if (all(something, something)) using this instead\r\n\r\n      bvec4 inFrustumVec = bvec4(shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0);\r\n      bool inFrustum = all(inFrustumVec);\r\n\r\n      // don\'t shadow pixels outside of light frustum\r\n      // use just first frustum (for cascades)\r\n      // don\'t shadow pixels behind far plane of light frustum\r\n\r\n      bvec2 frustumTestVec = bvec2(inFrustum, shadowCoord.z <= 1.0);\r\n\r\n      bool frustumTest = all(frustumTestVec);\r\n\r\n        if (frustumTest) {\r\n\r\n          shadowCoord.z += shadowBias[i];\r\n\r\n          #if defined(SHADOWMAP_TYPE_PCF)\r\n\r\n            // Percentage-close filtering\r\n            // (9 pixel kernel)\r\n            // http://fabiensanglard.net/shadowmappingPCF/\r\n\r\n            float shadow = 0.0;\r\n\r\n            const float shadowDelta = 1.0 / 9.0;\r\n\r\n            float xPixelOffset = 1.0 / shadowMapSize[i].x;\r\n            float yPixelOffset = 1.0 / shadowMapSize[i].y;\r\n\r\n            float dx0 = -1.25 * xPixelOffset;\r\n            float dy0 = -1.25 * yPixelOffset;\r\n            float dx1 = 1.25 * xPixelOffset;\r\n            float dy1 = 1.25 * yPixelOffset;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, dy0)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(0.0, dy0)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, dy0)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, 0.0)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, 0.0)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, dy1)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(0.0, dy1)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            fDepth = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, dy1)));\r\n            if (fDepth < shadowCoord.z) shadow += shadowDelta;\r\n\r\n            shadowColor = shadowColor * vec3((1.0 - shadowDarkness[i] * shadow));\r\n\r\n          #elif defined(SHADOWMAP_TYPE_PCF_SOFT)\r\n\r\n            // Percentage-close filtering\r\n            // (9 pixel kernel)\r\n            // http://fabiensanglard.net/shadowmappingPCF/\r\n\r\n            float shadow = 0.0;\r\n\r\n            float xPixelOffset = 1.0 / shadowMapSize[i].x;\r\n            float yPixelOffset = 1.0 / shadowMapSize[i].y;\r\n\r\n            float dx0 = -1.0 * xPixelOffset;\r\n            float dy0 = -1.0 * yPixelOffset;\r\n            float dx1 = 1.0 * xPixelOffset;\r\n            float dy1 = 1.0 * yPixelOffset;\r\n\r\n            mat3 shadowKernel;\r\n            mat3 depthKernel;\r\n\r\n            depthKernel[0][0] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, dy0)));\r\n            depthKernel[0][1] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, 0.0)));\r\n            depthKernel[0][2] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx0, dy1)));\r\n            depthKernel[1][0] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(0.0, dy0)));\r\n            depthKernel[1][1] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy));\r\n            depthKernel[1][2] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(0.0, dy1)));\r\n            depthKernel[2][0] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, dy0)));\r\n            depthKernel[2][1] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, 0.0)));\r\n            depthKernel[2][2] = unpackDepth(texture2D(shadowMap[i], shadowCoord.xy + vec2(dx1, dy1)));\r\n\r\n            vec3 shadowZ = vec3(shadowCoord.z);\r\n            shadowKernel[0] = vec3(lessThan(depthKernel[0], shadowZ));\r\n            shadowKernel[0] *= vec3(0.25);\r\n\r\n            shadowKernel[1] = vec3(lessThan(depthKernel[1], shadowZ));\r\n            shadowKernel[1] *= vec3(0.25);\r\n\r\n            shadowKernel[2] = vec3(lessThan(depthKernel[2], shadowZ));\r\n            shadowKernel[2] *= vec3(0.25);\r\n\r\n            vec2 fractionalCoord = 1.0 - fract(shadowCoord.xy * shadowMapSize[i].xy);\r\n\r\n            shadowKernel[0] = mix(shadowKernel[1], shadowKernel[0], fractionalCoord.x);\r\n            shadowKernel[1] = mix(shadowKernel[2], shadowKernel[1], fractionalCoord.x);\r\n\r\n            vec4 shadowValues;\r\n            shadowValues.x = mix(shadowKernel[0][1], shadowKernel[0][0], fractionalCoord.y);\r\n            shadowValues.y = mix(shadowKernel[0][2], shadowKernel[0][1], fractionalCoord.y);\r\n            shadowValues.z = mix(shadowKernel[1][1], shadowKernel[1][0], fractionalCoord.y);\r\n            shadowValues.w = mix(shadowKernel[1][2], shadowKernel[1][1], fractionalCoord.y);\r\n\r\n            shadow = dot(shadowValues, vec4(1.0));\r\n\r\n            shadowColor = shadowColor * vec3((1.0 - shadowDarkness[i] * shadow));\r\n\r\n          #else\r\n\r\n            vec4 rgbaDepth = texture2D(shadowMap[i], shadowCoord.xy);\r\n            float fDepth = unpackDepth(rgbaDepth);\r\n\r\n            if (fDepth < shadowCoord.z) shadowColor = shadowColor * vec3(1.0 - shadowDarkness[i]);\r\n\r\n          #endif\r\n\r\n      }\r\n\r\n    }\r\n\r\n    light = light * shadowColor;\r\n\r\n  #endif\r\n\r\n  #ifdef USE_FOG\r\n\r\n    float depth = gl_FragCoord.z / gl_FragCoord.w;\r\n\r\n    #ifdef FOG_EXP2\r\n\r\n      float fogFactor = exp2(-square(fogDensity) * square(depth) * LOG2);\r\n      fogFactor = whiteCompliment(fogFactor);\r\n\r\n    #else\r\n\r\n      float fogFactor = smoothstep(fogNear, fogFar, depth);\r\n\r\n    #endif\r\n\r\n    light = mix(light, fogColor, fogFactor);\r\n\r\n  #endif\r\n\r\n  gl_FragColor = vec4(light, color.a);\r\n\r\n}\r\n';
  },
  './node_modules/rgb/index.js': function (require, module, exports, global) {
    'use strict';
    var colors = {
      maroon: '#800000',
      red: '#ff0000',
      orange: '#ffA500',
      yellow: '#ffff00',
      olive: '#808000',
      purple: '#800080',
      fuchsia: '#ff00ff',
      white: '#ffffff',
      lime: '#00ff00',
      green: '#008000',
      navy: '#000080',
      blue: '#0000ff',
      aqua: '#00ffff',
      teal: '#008080',
      black: '#000000',
      silver: '#c0c0c0',
      gray: '#808080',
      transparent: '#0000'
    };
    var RGBtoRGB = function (r, g, b, a) {
      if (a == null || a === '')
        a = 1;
      r = parseFloat(r);
      g = parseFloat(g);
      b = parseFloat(b);
      a = parseFloat(a);
      if (!(r <= 255 && r >= 0 && g <= 255 && g >= 0 && b <= 255 && b >= 0 && a <= 1 && a >= 0))
        return null;
      return [
        Math.round(r),
        Math.round(g),
        Math.round(b),
        a
      ];
    };
    var HEXtoRGB = function (hex) {
      if (hex.length === 3)
        hex += 'f';
      if (hex.length === 4) {
        var h0 = hex.charAt(0), h1 = hex.charAt(1), h2 = hex.charAt(2), h3 = hex.charAt(3);
        hex = h0 + h0 + h1 + h1 + h2 + h2 + h3 + h3;
      }
      if (hex.length === 6)
        hex += 'ff';
      var rgb = [];
      for (var i = 0, l = hex.length; i < l; i += 2)
        rgb.push(parseInt(hex.substr(i, 2), 16) / (i === 6 ? 255 : 1));
      return rgb;
    };
    var HUEtoRGB = function (p, q, t) {
      if (t < 0)
        t += 1;
      if (t > 1)
        t -= 1;
      if (t < 1 / 6)
        return p + (q - p) * 6 * t;
      if (t < 1 / 2)
        return q;
      if (t < 2 / 3)
        return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    var HSLtoRGB = function (h, s, l, a) {
      var r, b, g;
      if (a == null || a === '')
        a = 1;
      h = parseFloat(h) / 360;
      s = parseFloat(s) / 100;
      l = parseFloat(l) / 100;
      a = parseFloat(a) / 1;
      if (h > 1 || h < 0 || s > 1 || s < 0 || l > 1 || l < 0 || a > 1 || a < 0)
        return null;
      if (s === 0) {
        r = b = g = l;
      } else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = HUEtoRGB(p, q, h + 1 / 3);
        g = HUEtoRGB(p, q, h);
        b = HUEtoRGB(p, q, h - 1 / 3);
      }
      return [
        r * 255,
        g * 255,
        b * 255,
        a
      ];
    };
    var keys = [];
    for (var c in colors)
      keys.push(c);
    var shex = '(?:#([a-f0-9]{3,8}))', sval = '\\s*([.\\d%]+)\\s*', sop = '(?:,\\s*([.\\d]+)\\s*)?', slist = '\\(' + [
        sval,
        sval,
        sval
      ] + sop + '\\)', srgb = '(?:rgb)a?', shsl = '(?:hsl)a?', skeys = '(' + keys.join('|') + ')';
    var xhex = RegExp(shex, 'i'), xrgb = RegExp(srgb + slist, 'i'), xhsl = RegExp(shsl + slist, 'i');
    var color = function (input, array) {
      if (input == null)
        return null;
      input = (input + '').replace(/\s+/, '');
      var match = colors[input];
      if (match) {
        return color(match, array);
      } else if (match = input.match(xhex)) {
        input = HEXtoRGB(match[1]);
      } else if (match = input.match(xrgb)) {
        input = match.slice(1);
      } else if (match = input.match(xhsl)) {
        input = HSLtoRGB.apply(null, match.slice(1));
      } else
        return null;
      if (!(input && (input = RGBtoRGB.apply(null, input))))
        return null;
      if (array)
        return input;
      if (input[3] === 1)
        input.splice(3, 1);
      return 'rgb' + (input.length === 4 ? 'a' : '') + '(' + input + ')';
    };
    var regexp = RegExp([
      skeys,
      shex,
      srgb + slist,
      shsl + slist
    ].join('|'), 'gi');
    color.replace = function (string, method) {
      if (!method)
        method = function (match) {
          return color(match);
        };
      return (string + '').replace(regexp, method);
    };
    color.matches = function (string) {
      return !!(string + '').match(regexp);
    };
    module.exports = color;
  },
  './node_modules/es6-util/class/create.js': function (require, module, exports, global) {
    'use strict';
    var callExpression = require('./node_modules/es6-util/class/descriptors.js');
    var getDescriptors = callExpression.getDescriptors;
    var create = Object.create, defineProperty = Object.defineProperty, defineProperties = Object.defineProperties;
    exports.default = function createClass(SuperClass, Class, prototypeMethods, staticMethods) {
      if (SuperClass) {
        Class.__proto__ = SuperClass;
      }
      defineProperty(Class, 'prototype', { value: create(SuperClass === null ? null : SuperClass.prototype, getDescriptors(prototypeMethods)) });
      defineProperty(Class.prototype, 'constructor', { value: Class });
      if (staticMethods) {
        defineProperties(Class, getDescriptors(staticMethods));
      }
      return Class;
    };
  },
  './node_modules/es6-util/class/descriptors.js': function (require, module, exports, global) {
    'use strict';
    var keys = Object.keys, getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    var getDescriptor = function (object, key) {
      var descriptor = getOwnPropertyDescriptor(object, key);
      if (!('get' in descriptor) && !('set' in descriptor)) {
        descriptor.enumerable = false;
      }
      return descriptor;
    };
    exports.getDescriptor = getDescriptor;
    var getDescriptors = function (object) {
      var base = {}, key;
      for (var i = 0, array = keys(object); i < array.length; i++) {
        key = array[i];
        base[key] = getDescriptor(object, key);
      }
      return base;
    };
    exports.getDescriptors = getDescriptors;
  }
}));
