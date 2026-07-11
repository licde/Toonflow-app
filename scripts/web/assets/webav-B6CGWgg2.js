import { a as getDefaultExportFromCjs } from './dayjs-CuToSpIM.js';

var mp4box_all = {};

(function (exports$1) {
	// file:src/log.js
	/* 
	 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	var Log = (function (){
			var start = new Date();
			var LOG_LEVEL_ERROR 	= 4;
			var LOG_LEVEL_WARNING 	= 3;
			var LOG_LEVEL_INFO 		= 2;
			var LOG_LEVEL_DEBUG		= 1;
			var log_level = LOG_LEVEL_ERROR;
			var logObject = {
				setLogLevel : function(level) {
					if (level == this.debug) log_level = LOG_LEVEL_DEBUG;
					else if (level == this.info) log_level = LOG_LEVEL_INFO;
					else if (level == this.warn) log_level = LOG_LEVEL_WARNING;
					else if (level == this.error) log_level = LOG_LEVEL_ERROR;
					else log_level = LOG_LEVEL_ERROR;
				},
				debug : function(module, msg) {
					if (console.debug === undefined) {
						console.debug = console.log;
					}
					if (LOG_LEVEL_DEBUG >= log_level) {
						console.debug("["+Log.getDurationString(new Date()-start,1000)+"]","["+module+"]",msg);
					}
				},
				log : function(module, msg) {
					this.debug(module.msg);
				},
				info : function(module, msg) {
					if (LOG_LEVEL_INFO >= log_level) {
						console.info("["+Log.getDurationString(new Date()-start,1000)+"]","["+module+"]",msg);
					}
				},
				warn : function(module, msg) {
					if (LOG_LEVEL_WARNING >= log_level) {
						console.warn("["+Log.getDurationString(new Date()-start,1000)+"]","["+module+"]",msg);
					}
				},
				error : function(module, msg) {
					if (LOG_LEVEL_ERROR >= log_level) {
						console.error("["+Log.getDurationString(new Date()-start,1000)+"]","["+module+"]",msg);
					}
				}
			};
			return logObject;
		})();
		
	/* Helper function to print a duration value in the form H:MM:SS.MS */
	Log.getDurationString = function(duration, _timescale) {
		var neg;
		/* Helper function to print a number on a fixed number of digits */
		function pad(number, length) {
			var str = '' + number;
			var a = str.split('.');		
			while (a[0].length < length) {
				a[0] = '0' + a[0];
			}
			return a.join('.');
		}
		if (duration < 0) {
			neg = true;
			duration = -duration;
		} else {
			neg = false;	
		}
		var timescale = _timescale || 1;
		var duration_sec = duration/timescale;
		var hours = Math.floor(duration_sec/3600);
		duration_sec -= hours * 3600;
		var minutes = Math.floor(duration_sec/60);
		duration_sec -= minutes * 60;		
		var msec = duration_sec*1000;
		duration_sec = Math.floor(duration_sec);
		msec -= duration_sec*1000;
		msec = Math.floor(msec);
		return (neg ? "-": "")+hours+":"+pad(minutes,2)+":"+pad(duration_sec,2)+"."+pad(msec,3);
	};
		
	/* Helper function to stringify HTML5 TimeRanges objects */	
	Log.printRanges = function(ranges) {
		var length = ranges.length;
		if (length > 0) {
			var str = "";
			for (var i = 0; i < length; i++) {
			  if (i > 0) str += ",";
			  str += "["+Log.getDurationString(ranges.start(i))+ ","+Log.getDurationString(ranges.end(i))+"]";
			}
			return str;
		} else {
			return "(empty)";
		}
	};

	{
		exports$1.Log = Log;
	}
	// file:src/stream.js
	var MP4BoxStream = function(arrayBuffer) {
	  if (arrayBuffer instanceof ArrayBuffer) {
	    this.buffer = arrayBuffer;
	    this.dataview = new DataView(arrayBuffer);
	  } else {
	    throw ("Needs an array buffer");
	  }
	  this.position = 0;
	};

	/*************************************************************************
	  Common API between MultiBufferStream and SimpleStream
	 *************************************************************************/
	MP4BoxStream.prototype.getPosition = function() {
	  return this.position;
	};

	MP4BoxStream.prototype.getEndPosition = function() {
	  return this.buffer.byteLength;
	};

	MP4BoxStream.prototype.getLength = function() {
	  return this.buffer.byteLength;
	};

	MP4BoxStream.prototype.seek = function (pos) {
	  var npos = Math.max(0, Math.min(this.buffer.byteLength, pos));
	  this.position = (isNaN(npos) || !isFinite(npos)) ? 0 : npos;
	  return true;
	};

	MP4BoxStream.prototype.isEos = function () {
	  return this.getPosition() >= this.getEndPosition();
	};

	/*************************************************************************
	  Read methods, simimar to DataStream but simpler
	 *************************************************************************/
	MP4BoxStream.prototype.readAnyInt = function(size, signed) {
	  var res = 0;
	  if (this.position + size <= this.buffer.byteLength) {
	    switch (size) {
	      case 1:
	        if (signed) {
	          res = this.dataview.getInt8(this.position);
	        } else {
	          res = this.dataview.getUint8(this.position);
	        }
	        break;
	      case 2:
	        if (signed) {
	          res = this.dataview.getInt16(this.position);
	        } else {
	          res = this.dataview.getUint16(this.position);
	        }
	        break;
	      case 3:
	        if (signed) {
	          throw ("No method for reading signed 24 bits values");
	        } else {
	          res = this.dataview.getUint8(this.position) << 16;
	          res |= this.dataview.getUint8(this.position+1) << 8;
	          res |= this.dataview.getUint8(this.position+2);
	        }
	        break;
	      case 4:
	        if (signed) {
	          res = this.dataview.getInt32(this.position);
	        } else {
	          res = this.dataview.getUint32(this.position);
	        }
	        break;
	      case 8:
	        if (signed) {
	          throw ("No method for reading signed 64 bits values");
	        } else {
	          res = this.dataview.getUint32(this.position) << 32;
	          res |= this.dataview.getUint32(this.position+4);
	        }
	        break;
	      default:
	        throw ("readInt method not implemented for size: "+size);
	    }
	    this.position+= size;
	    return res;
	  } else {
	    throw ("Not enough bytes in buffer");
	  }
	};

	MP4BoxStream.prototype.readUint8 = function() {
	  return this.readAnyInt(1, false);
	};

	MP4BoxStream.prototype.readUint16 = function() {
	  return this.readAnyInt(2, false);
	};

	MP4BoxStream.prototype.readUint24 = function() {
	  return this.readAnyInt(3, false);
	};

	MP4BoxStream.prototype.readUint32 = function() {
	  return this.readAnyInt(4, false);
	};

	MP4BoxStream.prototype.readUint64 = function() {
	  return this.readAnyInt(8, false);
	};

	MP4BoxStream.prototype.readString = function(length) {
	  if (this.position + length <= this.buffer.byteLength) {
	    var s = "";
	    for (var i = 0; i < length; i++) {
	      s += String.fromCharCode(this.readUint8());
	    }
	    return s;
	  } else {
	    throw ("Not enough bytes in buffer");
	  }
	};

	MP4BoxStream.prototype.readCString = function() {
	  var arr = [];
	  while(true) {
	    var b = this.readUint8();
	    if (b !== 0) {
	      arr.push(b);
	    } else {
	      break;
	    }
	  }
	  return String.fromCharCode.apply(null, arr); 
	};

	MP4BoxStream.prototype.readInt8 = function() {
	  return this.readAnyInt(1, true);
	};

	MP4BoxStream.prototype.readInt16 = function() {
	  return this.readAnyInt(2, true);
	};

	MP4BoxStream.prototype.readInt32 = function() {
	  return this.readAnyInt(4, true);
	};

	MP4BoxStream.prototype.readInt64 = function() {
	  return this.readAnyInt(8, false);
	};

	MP4BoxStream.prototype.readUint8Array = function(length) {
	  var arr = new Uint8Array(length);
	  for (var i = 0; i < length; i++) {
	    arr[i] = this.readUint8();
	  }
	  return arr;
	};

	MP4BoxStream.prototype.readInt16Array = function(length) {
	  var arr = new Int16Array(length);
	  for (var i = 0; i < length; i++) {
	    arr[i] = this.readInt16();
	  }
	  return arr;
	};

	MP4BoxStream.prototype.readUint16Array = function(length) {
	  var arr = new Int16Array(length);
	  for (var i = 0; i < length; i++) {
	    arr[i] = this.readUint16();
	  }
	  return arr;
	};

	MP4BoxStream.prototype.readUint32Array = function(length) {
	  var arr = new Uint32Array(length);
	  for (var i = 0; i < length; i++) {
	    arr[i] = this.readUint32();
	  }
	  return arr;
	};

	MP4BoxStream.prototype.readInt32Array = function(length) {
	  var arr = new Int32Array(length);
	  for (var i = 0; i < length; i++) {
	    arr[i] = this.readInt32();
	  }
	  return arr;
	};

	{
	  exports$1.MP4BoxStream = MP4BoxStream;
	}// file:src/DataStream.js
	/**
	  DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
	  It's like a file-like DataView on steroids.

	  @param {ArrayBuffer} arrayBuffer ArrayBuffer to read from.
	  @param {?Number} byteOffset Offset from arrayBuffer beginning for the DataStream.
	  @param {?Boolean} endianness DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN (the default).
	  */
	var DataStream = function(arrayBuffer, byteOffset, endianness) {
	  this._byteOffset = byteOffset || 0;
	  if (arrayBuffer instanceof ArrayBuffer) {
	    this.buffer = arrayBuffer;
	  } else if (typeof arrayBuffer == "object") {
	    this.dataView = arrayBuffer;
	    if (byteOffset) {
	      this._byteOffset += byteOffset;
	    }
	  } else {
	    this.buffer = new ArrayBuffer(arrayBuffer || 0);
	  }
	  this.position = 0;
	  this.endianness = endianness == null ? DataStream.LITTLE_ENDIAN : endianness;
	};
	DataStream.prototype = {};

	DataStream.prototype.getPosition = function() {
	  return this.position;
	};

	/**
	  Internal function to resize the DataStream buffer when required.
	  @param {number} extra Number of bytes to add to the buffer allocation.
	  @return {null}
	  */
	DataStream.prototype._realloc = function(extra) {
	  if (!this._dynamicSize) {
	    return;
	  }
	  var req = this._byteOffset + this.position + extra;
	  var blen = this._buffer.byteLength;
	  if (req <= blen) {
	    if (req > this._byteLength) {
	      this._byteLength = req;
	    }
	    return;
	  }
	  if (blen < 1) {
	    blen = 1;
	  }
	  while (req > blen) {
	    blen *= 2;
	  }
	  var buf = new ArrayBuffer(blen);
	  var src = new Uint8Array(this._buffer);
	  var dst = new Uint8Array(buf, 0, src.length);
	  dst.set(src);
	  this.buffer = buf;
	  this._byteLength = req;
	};

	/**
	  Internal function to trim the DataStream buffer when required.
	  Used for stripping out the extra bytes from the backing buffer when
	  the virtual byteLength is smaller than the buffer byteLength (happens after
	  growing the buffer with writes and not filling the extra space completely).

	  @return {null}
	  */
	DataStream.prototype._trimAlloc = function() {
	  if (this._byteLength == this._buffer.byteLength) {
	    return;
	  }
	  var buf = new ArrayBuffer(this._byteLength);
	  var dst = new Uint8Array(buf);
	  var src = new Uint8Array(this._buffer, 0, dst.length);
	  dst.set(src);
	  this.buffer = buf;
	};


	/**
	  Big-endian const to use as default endianness.
	  @type {boolean}
	  */
	DataStream.BIG_ENDIAN = false;

	/**
	  Little-endian const to use as default endianness.
	  @type {boolean}
	  */
	DataStream.LITTLE_ENDIAN = true;

	/**
	  Virtual byte length of the DataStream backing buffer.
	  Updated to be max of original buffer size and last written size.
	  If dynamicSize is false is set to buffer size.
	  @type {number}
	  */
	DataStream.prototype._byteLength = 0;

	/**
	  Returns the byte length of the DataStream object.
	  @type {number}
	  */
	Object.defineProperty(DataStream.prototype, 'byteLength',
	  { get: function() {
	    return this._byteLength - this._byteOffset;
	  }});

	/**
	  Set/get the backing ArrayBuffer of the DataStream object.
	  The setter updates the DataView to point to the new buffer.
	  @type {Object}
	  */
	Object.defineProperty(DataStream.prototype, 'buffer',
	  { get: function() {
	      this._trimAlloc();
	      return this._buffer;
	    },
	    set: function(v) {
	      this._buffer = v;
	      this._dataView = new DataView(this._buffer, this._byteOffset);
	      this._byteLength = this._buffer.byteLength;
	    } });

	/**
	  Set/get the byteOffset of the DataStream object.
	  The setter updates the DataView to point to the new byteOffset.
	  @type {number}
	  */
	Object.defineProperty(DataStream.prototype, 'byteOffset',
	  { get: function() {
	      return this._byteOffset;
	    },
	    set: function(v) {
	      this._byteOffset = v;
	      this._dataView = new DataView(this._buffer, this._byteOffset);
	      this._byteLength = this._buffer.byteLength;
	    } });

	/**
	  Set/get the backing DataView of the DataStream object.
	  The setter updates the buffer and byteOffset to point to the DataView values.
	  @type {Object}
	  */
	Object.defineProperty(DataStream.prototype, 'dataView',
	  { get: function() {
	      return this._dataView;
	    },
	    set: function(v) {
	      this._byteOffset = v.byteOffset;
	      this._buffer = v.buffer;
	      this._dataView = new DataView(this._buffer, this._byteOffset);
	      this._byteLength = this._byteOffset + v.byteLength;
	    } });

	/**
	  Sets the DataStream read/write position to given position.
	  Clamps between 0 and DataStream length.

	  @param {number} pos Position to seek to.
	  @return {null}
	  */
	DataStream.prototype.seek = function(pos) {
	  var npos = Math.max(0, Math.min(this.byteLength, pos));
	  this.position = (isNaN(npos) || !isFinite(npos)) ? 0 : npos;
	};

	/**
	  Returns true if the DataStream seek pointer is at the end of buffer and
	  there's no more data to read.

	  @return {boolean} True if the seek pointer is at the end of the buffer.
	  */
	DataStream.prototype.isEof = function() {
	  return (this.position >= this._byteLength);
	};


	/**
	  Maps a Uint8Array into the DataStream buffer.

	  Nice for quickly reading in data.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Uint8Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapUint8Array = function(length) {
	  this._realloc(length * 1);
	  var arr = new Uint8Array(this._buffer, this.byteOffset+this.position, length);
	  this.position += length * 1;
	  return arr;
	};


	/**
	  Reads an Int32Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Int32Array.
	 */
	DataStream.prototype.readInt32Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 4) : length;
	  var arr = new Int32Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads an Int16Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Int16Array.
	 */
	DataStream.prototype.readInt16Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 2) : length;
	  var arr = new Int16Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads an Int8Array of desired length from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Int8Array.
	 */
	DataStream.prototype.readInt8Array = function(length) {
	  length = length == null ? (this.byteLength-this.position) : length;
	  var arr = new Int8Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads a Uint32Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Uint32Array.
	 */
	DataStream.prototype.readUint32Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 4) : length;
	  var arr = new Uint32Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads a Uint16Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Uint16Array.
	 */
	DataStream.prototype.readUint16Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 2) : length;
	  var arr = new Uint16Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads a Uint8Array of desired length from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Uint8Array.
	 */
	DataStream.prototype.readUint8Array = function(length) {
	  length = length == null ? (this.byteLength-this.position) : length;
	  var arr = new Uint8Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads a Float64Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Float64Array.
	 */
	DataStream.prototype.readFloat64Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 8) : length;
	  var arr = new Float64Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};

	/**
	  Reads a Float32Array of desired length and endianness from the DataStream.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} The read Float32Array.
	 */
	DataStream.prototype.readFloat32Array = function(length, e) {
	  length = length == null ? (this.byteLength-this.position / 4) : length;
	  var arr = new Float32Array(length);
	  DataStream.memcpy(arr.buffer, 0,
	                    this.buffer, this.byteOffset+this.position,
	                    length*arr.BYTES_PER_ELEMENT);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += arr.byteLength;
	  return arr;
	};


	/**
	  Reads a 32-bit int from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readInt32 = function(e) {
	  var v = this._dataView.getInt32(this.position, e == null ? this.endianness : e);
	  this.position += 4;
	  return v;
	};

	/**
	  Reads a 16-bit int from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readInt16 = function(e) {
	  var v = this._dataView.getInt16(this.position, e == null ? this.endianness : e);
	  this.position += 2;
	  return v;
	};

	/**
	  Reads an 8-bit int from the DataStream.

	  @return {number} The read number.
	 */
	DataStream.prototype.readInt8 = function() {
	  var v = this._dataView.getInt8(this.position);
	  this.position += 1;
	  return v;
	};

	/**
	  Reads a 32-bit unsigned int from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readUint32 = function(e) {
	  var v = this._dataView.getUint32(this.position, e == null ? this.endianness : e);
	  this.position += 4;
	  return v;
	};

	/**
	  Reads a 16-bit unsigned int from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readUint16 = function(e) {
	  var v = this._dataView.getUint16(this.position, e == null ? this.endianness : e);
	  this.position += 2;
	  return v;
	};

	/**
	  Reads an 8-bit unsigned int from the DataStream.

	  @return {number} The read number.
	 */
	DataStream.prototype.readUint8 = function() {
	  var v = this._dataView.getUint8(this.position);
	  this.position += 1;
	  return v;
	};

	/**
	  Reads a 32-bit float from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readFloat32 = function(e) {
	  var v = this._dataView.getFloat32(this.position, e == null ? this.endianness : e);
	  this.position += 4;
	  return v;
	};

	/**
	  Reads a 64-bit float from the DataStream with the desired endianness.

	  @param {?boolean} e Endianness of the number.
	  @return {number} The read number.
	 */
	DataStream.prototype.readFloat64 = function(e) {
	  var v = this._dataView.getFloat64(this.position, e == null ? this.endianness : e);
	  this.position += 8;
	  return v;
	};

	/**
	  Native endianness. Either DataStream.BIG_ENDIAN or DataStream.LITTLE_ENDIAN
	  depending on the platform endianness.

	  @type {boolean}
	 */
	DataStream.endianness = new Int8Array(new Int16Array([1]).buffer)[0] > 0;

	/**
	  Copies byteLength bytes from the src buffer at srcOffset to the
	  dst buffer at dstOffset.

	  @param {Object} dst Destination ArrayBuffer to write to.
	  @param {number} dstOffset Offset to the destination ArrayBuffer.
	  @param {Object} src Source ArrayBuffer to read from.
	  @param {number} srcOffset Offset to the source ArrayBuffer.
	  @param {number} byteLength Number of bytes to copy.
	 */
	DataStream.memcpy = function(dst, dstOffset, src, srcOffset, byteLength) {
	  var dstU8 = new Uint8Array(dst, dstOffset, byteLength);
	  var srcU8 = new Uint8Array(src, srcOffset, byteLength);
	  dstU8.set(srcU8);
	};

	/**
	  Converts array to native endianness in-place.

	  @param {Object} array Typed array to convert.
	  @param {boolean} arrayIsLittleEndian True if the data in the array is
	                                       little-endian. Set false for big-endian.
	  @return {Object} The converted typed array.
	 */
	DataStream.arrayToNative = function(array, arrayIsLittleEndian) {
	  if (arrayIsLittleEndian == this.endianness) {
	    return array;
	  } else {
	    return this.flipArrayEndianness(array);
	  }
	};

	/**
	  Converts native endianness array to desired endianness in-place.

	  @param {Object} array Typed array to convert.
	  @param {boolean} littleEndian True if the converted array should be
	                                little-endian. Set false for big-endian.
	  @return {Object} The converted typed array.
	 */
	DataStream.nativeToEndian = function(array, littleEndian) {
	  if (this.endianness == littleEndian) {
	    return array;
	  } else {
	    return this.flipArrayEndianness(array);
	  }
	};

	/**
	  Flips typed array endianness in-place.

	  @param {Object} array Typed array to flip.
	  @return {Object} The converted typed array.
	 */
	DataStream.flipArrayEndianness = function(array) {
	  var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
	  for (var i=0; i<array.byteLength; i+=array.BYTES_PER_ELEMENT) {
	    for (var j=i+array.BYTES_PER_ELEMENT-1, k=i; j>k; j--, k++) {
	      var tmp = u8[k];
	      u8[k] = u8[j];
	      u8[j] = tmp;
	    }
	  }
	  return array;
	};

	/**
	  Seek position where DataStream#readStruct ran into a problem.
	  Useful for debugging struct parsing.

	  @type {number}
	 */
	DataStream.prototype.failurePosition = 0;

	String.fromCharCodeUint8 = function(uint8arr) {
	    var arr = [];
	    for (var i = 0; i < uint8arr.length; i++) {
	      arr[i] = uint8arr[i];
	    }
	    return String.fromCharCode.apply(null, arr);
	};
	/**
	  Read a string of desired length and encoding from the DataStream.

	  @param {number} length The length of the string to read in bytes.
	  @param {?string} encoding The encoding of the string data in the DataStream.
	                            Defaults to ASCII.
	  @return {string} The read string.
	 */
	DataStream.prototype.readString = function(length, encoding) {
	  if (encoding == null || encoding == "ASCII") {
	    return String.fromCharCodeUint8.apply(null, [this.mapUint8Array(length == null ? this.byteLength-this.position : length)]);
	  } else {
	    return (new TextDecoder(encoding)).decode(this.mapUint8Array(length));
	  }
	};

	/**
	  Read null-terminated string of desired length from the DataStream. Truncates
	  the returned string so that the null byte is not a part of it.

	  @param {?number} length The length of the string to read.
	  @return {string} The read string.
	 */
	DataStream.prototype.readCString = function(length) {
	  var blen = this.byteLength-this.position;
	  var u8 = new Uint8Array(this._buffer, this._byteOffset + this.position);
	  var len = blen;
	  if (length != null) {
	    len = Math.min(length, blen);
	  }
	  for (var i = 0; i < len && u8[i] !== 0; i++); // find first zero byte
	  var s = String.fromCharCodeUint8.apply(null, [this.mapUint8Array(i)]);
	  if (length != null) {
	    this.position += len-i;
	  } else if (i != blen) {
	    this.position += 1; // trailing zero if not at end of buffer
	  }
	  return s;
	};

	/* 
	   TODO: fix endianness for 24/64-bit fields
	   TODO: check range/support for 64-bits numbers in JavaScript
	*/
	var MAX_SIZE = Math.pow(2, 32);

	DataStream.prototype.readInt64 = function () {
	  return (this.readInt32()*MAX_SIZE)+this.readUint32();
	};
	DataStream.prototype.readUint64 = function () {
		return (this.readUint32()*MAX_SIZE)+this.readUint32();
	};

	DataStream.prototype.readInt64 = function () {
	  return (this.readUint32()*MAX_SIZE)+this.readUint32();
	};

	DataStream.prototype.readUint24 = function () {
		return (this.readUint8()<<16)+(this.readUint8()<<8)+this.readUint8();
	};

	{
	  exports$1.DataStream = DataStream;  
	}
	// file:src/DataStream-write.js
	/**
	  Saves the DataStream contents to the given filename.
	  Uses Chrome's anchor download property to initiate download.
	 
	  @param {string} filename Filename to save as.
	  @return {null}
	  */
	DataStream.prototype.save = function(filename) {
	  var blob = new Blob([this.buffer]);
	  if (window.URL && URL.createObjectURL) {
	      var url = window.URL.createObjectURL(blob);
	      var a = document.createElement('a');
	      // Required in Firefox:
	      document.body.appendChild(a);
	      a.setAttribute('href', url);
	      a.setAttribute('download', filename);
	      // Required in Firefox:
	      a.setAttribute('target', '_self');
	      a.click();
	      window.URL.revokeObjectURL(url);
	  } else {
	      throw("DataStream.save: Can't create object URL.");
	  }
	};

	/**
	  Whether to extend DataStream buffer when trying to write beyond its size.
	  If set, the buffer is reallocated to twice its current size until the
	  requested write fits the buffer.
	  @type {boolean}
	  */
	DataStream.prototype._dynamicSize = true;
	Object.defineProperty(DataStream.prototype, 'dynamicSize',
	  { get: function() {
	      return this._dynamicSize;
	    },
	    set: function(v) {
	      if (!v) {
	        this._trimAlloc();
	      }
	      this._dynamicSize = v;
	    } });

	/**
	  Internal function to trim the DataStream buffer when required.
	  Used for stripping out the first bytes when not needed anymore.

	  @return {null}
	  */
	DataStream.prototype.shift = function(offset) {
	  var buf = new ArrayBuffer(this._byteLength-offset);
	  var dst = new Uint8Array(buf);
	  var src = new Uint8Array(this._buffer, offset, dst.length);
	  dst.set(src);
	  this.buffer = buf;
	  this.position -= offset;
	};

	/**
	  Writes an Int32Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeInt32Array = function(arr, e) {
	  this._realloc(arr.length * 4);
	  if (arr instanceof Int32Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapInt32Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeInt32(arr[i], e);
	    }
	  }
	};

	/**
	  Writes an Int16Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeInt16Array = function(arr, e) {
	  this._realloc(arr.length * 2);
	  if (arr instanceof Int16Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapInt16Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeInt16(arr[i], e);
	    }
	  }
	};

	/**
	  Writes an Int8Array to the DataStream.

	  @param {Object} arr The array to write.
	 */
	DataStream.prototype.writeInt8Array = function(arr) {
	  this._realloc(arr.length * 1);
	  if (arr instanceof Int8Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapInt8Array(arr.length);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeInt8(arr[i]);
	    }
	  }
	};

	/**
	  Writes a Uint32Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeUint32Array = function(arr, e) {
	  this._realloc(arr.length * 4);
	  if (arr instanceof Uint32Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapUint32Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeUint32(arr[i], e);
	    }
	  }
	};

	/**
	  Writes a Uint16Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeUint16Array = function(arr, e) {
	  this._realloc(arr.length * 2);
	  if (arr instanceof Uint16Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapUint16Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeUint16(arr[i], e);
	    }
	  }
	};

	/**
	  Writes a Uint8Array to the DataStream.

	  @param {Object} arr The array to write.
	 */
	DataStream.prototype.writeUint8Array = function(arr) {
	  this._realloc(arr.length * 1);
	  if (arr instanceof Uint8Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapUint8Array(arr.length);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeUint8(arr[i]);
	    }
	  }
	};

	/**
	  Writes a Float64Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeFloat64Array = function(arr, e) {
	  this._realloc(arr.length * 8);
	  if (arr instanceof Float64Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapFloat64Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeFloat64(arr[i], e);
	    }
	  }
	};

	/**
	  Writes a Float32Array of specified endianness to the DataStream.

	  @param {Object} arr The array to write.
	  @param {?boolean} e Endianness of the data to write.
	 */
	DataStream.prototype.writeFloat32Array = function(arr, e) {
	  this._realloc(arr.length * 4);
	  if (arr instanceof Float32Array &&
	      this.byteOffset+this.position % arr.BYTES_PER_ELEMENT === 0) {
	    DataStream.memcpy(this._buffer, this.byteOffset+this.position,
	                      arr.buffer, 0,
	                      arr.byteLength);
	    this.mapFloat32Array(arr.length, e);
	  } else {
	    for (var i=0; i<arr.length; i++) {
	      this.writeFloat32(arr[i], e);
	    }
	  }
	};


	/**
	  Writes a 32-bit int to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeInt32 = function(v, e) {
	  this._realloc(4);
	  this._dataView.setInt32(this.position, v, e == null ? this.endianness : e);
	  this.position += 4;
	};

	/**
	  Writes a 16-bit int to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeInt16 = function(v, e) {
	  this._realloc(2);
	  this._dataView.setInt16(this.position, v, e == null ? this.endianness : e);
	  this.position += 2;
	};

	/**
	  Writes an 8-bit int to the DataStream.

	  @param {number} v Number to write.
	 */
	DataStream.prototype.writeInt8 = function(v) {
	  this._realloc(1);
	  this._dataView.setInt8(this.position, v);
	  this.position += 1;
	};

	/**
	  Writes a 32-bit unsigned int to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeUint32 = function(v, e) {
	  this._realloc(4);
	  this._dataView.setUint32(this.position, v, e == null ? this.endianness : e);
	  this.position += 4;
	};

	/**
	  Writes a 16-bit unsigned int to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeUint16 = function(v, e) {
	  this._realloc(2);
	  this._dataView.setUint16(this.position, v, e == null ? this.endianness : e);
	  this.position += 2;
	};

	/**
	  Writes an 8-bit unsigned  int to the DataStream.

	  @param {number} v Number to write.
	 */
	DataStream.prototype.writeUint8 = function(v) {
	  this._realloc(1);
	  this._dataView.setUint8(this.position, v);
	  this.position += 1;
	};

	/**
	  Writes a 32-bit float to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeFloat32 = function(v, e) {
	  this._realloc(4);
	  this._dataView.setFloat32(this.position, v, e == null ? this.endianness : e);
	  this.position += 4;
	};

	/**
	  Writes a 64-bit float to the DataStream with the desired endianness.

	  @param {number} v Number to write.
	  @param {?boolean} e Endianness of the number.
	 */
	DataStream.prototype.writeFloat64 = function(v, e) {
	  this._realloc(8);
	  this._dataView.setFloat64(this.position, v, e == null ? this.endianness : e);
	  this.position += 8;
	};

	/**
	  Write a UCS-2 string of desired endianness to the DataStream. The
	  lengthOverride argument lets you define the number of characters to write.
	  If the string is shorter than lengthOverride, the extra space is padded with
	  zeroes.

	  @param {string} str The string to write.
	  @param {?boolean} endianness The endianness to use for the written string data.
	  @param {?number} lengthOverride The number of characters to write.
	 */
	DataStream.prototype.writeUCS2String = function(str, endianness, lengthOverride) {
	  if (lengthOverride == null) {
	    lengthOverride = str.length;
	  }
	  for (var i = 0; i < str.length && i < lengthOverride; i++) {
	    this.writeUint16(str.charCodeAt(i), endianness);
	  }
	  for (; i<lengthOverride; i++) {
	    this.writeUint16(0);
	  }
	};

	/**
	  Writes a string of desired length and encoding to the DataStream.

	  @param {string} s The string to write.
	  @param {?string} encoding The encoding for the written string data.
	                            Defaults to ASCII.
	  @param {?number} length The number of characters to write.
	 */
	DataStream.prototype.writeString = function(s, encoding, length) {
	  var i = 0;
	  if (encoding == null || encoding == "ASCII") {
	    if (length != null) {
	      var len = Math.min(s.length, length);
	      for (i=0; i<len; i++) {
	        this.writeUint8(s.charCodeAt(i));
	      }
	      for (; i<length; i++) {
	        this.writeUint8(0);
	      }
	    } else {
	      for (i=0; i<s.length; i++) {
	        this.writeUint8(s.charCodeAt(i));
	      }
	    }
	  } else {
	    this.writeUint8Array((new TextEncoder(encoding)).encode(s.substring(0, length)));
	  }
	};

	/**
	  Writes a null-terminated string to DataStream and zero-pads it to length
	  bytes. If length is not given, writes the string followed by a zero.
	  If string is longer than length, the written part of the string does not have
	  a trailing zero.

	  @param {string} s The string to write.
	  @param {?number} length The number of characters to write.
	 */
	DataStream.prototype.writeCString = function(s, length) {
	  var i = 0;
	  if (length != null) {
	    var len = Math.min(s.length, length);
	    for (i=0; i<len; i++) {
	      this.writeUint8(s.charCodeAt(i));
	    }
	    for (; i<length; i++) {
	      this.writeUint8(0);
	    }
	  } else {
	    for (i=0; i<s.length; i++) {
	      this.writeUint8(s.charCodeAt(i));
	    }
	    this.writeUint8(0);
	  }
	};

	/**
	  Writes a struct to the DataStream. Takes a structDefinition that gives the
	  types and a struct object that gives the values. Refer to readStruct for the
	  structure of structDefinition.

	  @param {Object} structDefinition Type definition of the struct.
	  @param {Object} struct The struct data object.
	  */
	DataStream.prototype.writeStruct = function(structDefinition, struct) {
	  for (var i = 0; i < structDefinition.length; i+=2) {
	    var t = structDefinition[i+1];
	    this.writeType(t, struct[structDefinition[i]], struct);
	  }
	};

	/**
	  Writes object v of type t to the DataStream.

	  @param {Object} t Type of data to write.
	  @param {Object} v Value of data to write.
	  @param {Object} struct Struct to pass to write callback functions.
	  */
	DataStream.prototype.writeType = function(t, v, struct) {
	  var tp;
	  if (typeof t == "function") {
	    return t(this, v);
	  } else if (typeof t == "object" && !(t instanceof Array)) {
	    return t.set(this, v, struct);
	  }
	  var lengthOverride = null;
	  var charset = "ASCII";
	  var pos = this.position;
	  if (typeof(t) == 'string' && /:/.test(t)) {
	    tp = t.split(":");
	    t = tp[0];
	    lengthOverride = parseInt(tp[1]);
	  }
	  if (typeof t == 'string' && /,/.test(t)) {
	    tp = t.split(",");
	    t = tp[0];
	    charset = parseInt(tp[1]);
	  }

	  switch(t) {
	    case 'uint8':
	      this.writeUint8(v);
	      break;
	    case 'int8':
	      this.writeInt8(v);
	      break;

	    case 'uint16':
	      this.writeUint16(v, this.endianness);
	      break;
	    case 'int16':
	      this.writeInt16(v, this.endianness);
	      break;
	    case 'uint32':
	      this.writeUint32(v, this.endianness);
	      break;
	    case 'int32':
	      this.writeInt32(v, this.endianness);
	      break;
	    case 'float32':
	      this.writeFloat32(v, this.endianness);
	      break;
	    case 'float64':
	      this.writeFloat64(v, this.endianness);
	      break;

	    case 'uint16be':
	      this.writeUint16(v, DataStream.BIG_ENDIAN);
	      break;
	    case 'int16be':
	      this.writeInt16(v, DataStream.BIG_ENDIAN);
	      break;
	    case 'uint32be':
	      this.writeUint32(v, DataStream.BIG_ENDIAN);
	      break;
	    case 'int32be':
	      this.writeInt32(v, DataStream.BIG_ENDIAN);
	      break;
	    case 'float32be':
	      this.writeFloat32(v, DataStream.BIG_ENDIAN);
	      break;
	    case 'float64be':
	      this.writeFloat64(v, DataStream.BIG_ENDIAN);
	      break;

	    case 'uint16le':
	      this.writeUint16(v, DataStream.LITTLE_ENDIAN);
	      break;
	    case 'int16le':
	      this.writeInt16(v, DataStream.LITTLE_ENDIAN);
	      break;
	    case 'uint32le':
	      this.writeUint32(v, DataStream.LITTLE_ENDIAN);
	      break;
	    case 'int32le':
	      this.writeInt32(v, DataStream.LITTLE_ENDIAN);
	      break;
	    case 'float32le':
	      this.writeFloat32(v, DataStream.LITTLE_ENDIAN);
	      break;
	    case 'float64le':
	      this.writeFloat64(v, DataStream.LITTLE_ENDIAN);
	      break;

	    case 'cstring':
	      this.writeCString(v, lengthOverride);
	      break;

	    case 'string':
	      this.writeString(v, charset, lengthOverride);
	      break;

	    case 'u16string':
	      this.writeUCS2String(v, this.endianness, lengthOverride);
	      break;

	    case 'u16stringle':
	      this.writeUCS2String(v, DataStream.LITTLE_ENDIAN, lengthOverride);
	      break;

	    case 'u16stringbe':
	      this.writeUCS2String(v, DataStream.BIG_ENDIAN, lengthOverride);
	      break;

	    default:
	      if (t.length == 3) {
	        var ta = t[1];
	        for (var i=0; i<v.length; i++) {
	          this.writeType(ta, v[i]);
	        }
	        break;
	      } else {
	        this.writeStruct(t, v);
	        break;
	      }
	  }
	  if (lengthOverride != null) {
	    this.position = pos;
	    this._realloc(lengthOverride);
	    this.position = pos + lengthOverride;
	  }
	};


	DataStream.prototype.writeUint64 = function (v) {
		var h = Math.floor(v / MAX_SIZE);
		this.writeUint32(h);
		this.writeUint32(v & 0xFFFFFFFF);
	};

	DataStream.prototype.writeUint24 = function (v) {
		this.writeUint8((v & 0x00FF0000)>>16);
		this.writeUint8((v & 0x0000FF00)>>8);
		this.writeUint8((v & 0x000000FF));
	};

	DataStream.prototype.adjustUint32 = function(position, value) {
		var pos = this.position;
		this.seek(position);
		this.writeUint32(value);
		this.seek(pos);
	};
	// file:src/DataStream-map.js
	/**
	  Maps an Int32Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Int32Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapInt32Array = function(length, e) {
	  this._realloc(length * 4);
	  var arr = new Int32Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 4;
	  return arr;
	};

	/**
	  Maps an Int16Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Int16Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapInt16Array = function(length, e) {
	  this._realloc(length * 2);
	  var arr = new Int16Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 2;
	  return arr;
	};

	/**
	  Maps an Int8Array into the DataStream buffer.

	  Nice for quickly reading in data.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Int8Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapInt8Array = function(length) {
	  this._realloc(length * 1);
	  var arr = new Int8Array(this._buffer, this.byteOffset+this.position, length);
	  this.position += length * 1;
	  return arr;
	};

	/**
	  Maps a Uint32Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Uint32Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapUint32Array = function(length, e) {
	  this._realloc(length * 4);
	  var arr = new Uint32Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 4;
	  return arr;
	};

	/**
	  Maps a Uint16Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Uint16Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapUint16Array = function(length, e) {
	  this._realloc(length * 2);
	  var arr = new Uint16Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 2;
	  return arr;
	};

	/**
	  Maps a Float64Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Float64Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapFloat64Array = function(length, e) {
	  this._realloc(length * 8);
	  var arr = new Float64Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 8;
	  return arr;
	};

	/**
	  Maps a Float32Array into the DataStream buffer, swizzling it to native
	  endianness in-place. The current offset from the start of the buffer needs to
	  be a multiple of element size, just like with typed array views.

	  Nice for quickly reading in data. Warning: potentially modifies the buffer
	  contents.

	  @param {number} length Number of elements to map.
	  @param {?boolean} e Endianness of the data to read.
	  @return {Object} Float32Array to the DataStream backing buffer.
	  */
	DataStream.prototype.mapFloat32Array = function(length, e) {
	  this._realloc(length * 4);
	  var arr = new Float32Array(this._buffer, this.byteOffset+this.position, length);
	  DataStream.arrayToNative(arr, e == null ? this.endianness : e);
	  this.position += length * 4;
	  return arr;
	};
	// file:src/buffer.js
	/**
	 * MultiBufferStream is a class that acts as a SimpleStream for parsing 
	 * It holds several, possibly non-contiguous ArrayBuffer objects, each with a fileStart property 
	 * containing the offset for the buffer data in an original/virtual file 
	 *
	 * It inherits also from DataStream for all read/write/alloc operations
	 */

	/**
	 * Constructor
	 */
	var MultiBufferStream = function(buffer) {
		/* List of ArrayBuffers, with a fileStart property, sorted in fileStart order and non overlapping */
		this.buffers = [];	
		this.bufferIndex = -1;
		if (buffer) {
			this.insertBuffer(buffer);
			this.bufferIndex = 0;
		}
	};
	MultiBufferStream.prototype = new DataStream(new ArrayBuffer(), 0, DataStream.BIG_ENDIAN);

	/************************************************************************************
	  Methods for the managnement of the buffers (insertion, removal, concatenation, ...)
	 ***********************************************************************************/

	MultiBufferStream.prototype.initialized = function() {
		var firstBuffer;
		if (this.bufferIndex > -1) {
			return true;
		} else if (this.buffers.length > 0) {
			firstBuffer = this.buffers[0];
			if (firstBuffer.fileStart === 0) {
				this.buffer = firstBuffer;
				this.bufferIndex = 0;
				Log.debug("MultiBufferStream", "Stream ready for parsing");
				return true;
			} else {
				Log.warn("MultiBufferStream", "The first buffer should have a fileStart of 0");
				this.logBufferLevel();
				return false;
			}
		} else {
			Log.warn("MultiBufferStream", "No buffer to start parsing from");
			this.logBufferLevel();
			return false;
		}			
	};

	/**
	 * helper functions to concatenate two ArrayBuffer objects
	 * @param  {ArrayBuffer} buffer1 
	 * @param  {ArrayBuffer} buffer2 
	 * @return {ArrayBuffer} the concatenation of buffer1 and buffer2 in that order
	 */
	ArrayBuffer.concat = function(buffer1, buffer2) {
	  Log.debug("ArrayBuffer", "Trying to create a new buffer of size: "+(buffer1.byteLength + buffer2.byteLength));
	  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
	  tmp.set(new Uint8Array(buffer1), 0);
	  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
	  return tmp.buffer;
	};

	/**
	 * Reduces the size of a given buffer, but taking the part between offset and offset+newlength
	 * @param  {ArrayBuffer} buffer    
	 * @param  {Number}      offset    the start of new buffer
	 * @param  {Number}      newLength the length of the new buffer
	 * @return {ArrayBuffer}           the new buffer
	 */
	MultiBufferStream.prototype.reduceBuffer = function(buffer, offset, newLength) {
		var smallB;
		smallB = new Uint8Array(newLength);
		smallB.set(new Uint8Array(buffer, offset, newLength));
		smallB.buffer.fileStart = buffer.fileStart+offset;
		smallB.buffer.usedBytes = 0;
		return smallB.buffer;	
	};

	/**
	 * Inserts the new buffer in the sorted list of buffers,
	 *  making sure, it is not overlapping with existing ones (possibly reducing its size).
	 *  if the new buffer overrides/replaces the 0-th buffer (for instance because it is bigger), 
	 *  updates the DataStream buffer for parsing 
	*/
	MultiBufferStream.prototype.insertBuffer = function(ab) {	
		var to_add = true;
		/* TODO: improve insertion if many buffers */
		for (var i = 0; i < this.buffers.length; i++) {
			var b = this.buffers[i];
			if (ab.fileStart <= b.fileStart) {
				/* the insertion position is found */
				if (ab.fileStart === b.fileStart) {
					/* The new buffer overlaps with an existing buffer */
					if (ab.byteLength >  b.byteLength) {
						/* the new buffer is bigger than the existing one
						   remove the existing buffer and try again to insert 
						   the new buffer to check overlap with the next ones */
						this.buffers.splice(i, 1);
						i--; 
						continue;
					} else {
						/* the new buffer is smaller than the existing one, just drop it */
						Log.warn("MultiBufferStream", "Buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+") already appended, ignoring");
					}
				} else {
					/* The beginning of the new buffer is not overlapping with an existing buffer
					   let's check the end of it */
					if (ab.fileStart + ab.byteLength <= b.fileStart) ; else {
						/* There is some overlap, cut the new buffer short, and add it*/
						ab = this.reduceBuffer(ab, 0, b.fileStart - ab.fileStart);
					}
					Log.debug("MultiBufferStream", "Appending new buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+")");
					this.buffers.splice(i, 0, ab);
					/* if this new buffer is inserted in the first place in the list of the buffer, 
					   and the DataStream is initialized, make it the buffer used for parsing */
					if (i === 0) {
						this.buffer = ab;
					}
				}
				to_add = false;
				break;
			} else if (ab.fileStart < b.fileStart + b.byteLength) {
				/* the new buffer overlaps its beginning with the end of the current buffer */
				var offset = b.fileStart + b.byteLength - ab.fileStart;
				var newLength = ab.byteLength - offset;
				if (newLength > 0) {
					/* the new buffer is bigger than the current overlap, drop the overlapping part and try again inserting the remaining buffer */
					ab = this.reduceBuffer(ab, offset, newLength);
				} else {
					/* the content of the new buffer is entirely contained in the existing buffer, drop it entirely */
					to_add = false;
					break;
				}
			}
		}
		/* if the buffer has not been added, we can add it at the end */
		if (to_add) {
			Log.debug("MultiBufferStream", "Appending new buffer (fileStart: "+ab.fileStart+" - Length: "+ab.byteLength+")");
			this.buffers.push(ab);
			/* if this new buffer is inserted in the first place in the list of the buffer, 
			   and the DataStream is initialized, make it the buffer used for parsing */
			if (i === 0) {
				this.buffer = ab;
			}
		}
	};

	/**
	 * Displays the status of the buffers (number and used bytes)
	 * @param  {Object} info callback method for display
	 */
	MultiBufferStream.prototype.logBufferLevel = function(info) {
		var i;
		var buffer;
		var used, total;
		var ranges = [];
		var range;
		var bufferedString = "";
		used = 0;
		total = 0;
		for (i = 0; i < this.buffers.length; i++) {
			buffer = this.buffers[i];
			if (i === 0) {
				range = {};
				ranges.push(range);
				range.start = buffer.fileStart;
				range.end = buffer.fileStart+buffer.byteLength;
				bufferedString += "["+range.start+"-";
			} else if (range.end === buffer.fileStart) {
				range.end = buffer.fileStart+buffer.byteLength;
			} else {
				range = {};
				range.start = buffer.fileStart;
				bufferedString += (ranges[ranges.length-1].end-1)+"], ["+range.start+"-";
				range.end = buffer.fileStart+buffer.byteLength;
				ranges.push(range);
			}
			used += buffer.usedBytes;
			total += buffer.byteLength;
		}
		if (ranges.length > 0) {
			bufferedString += (range.end-1)+"]";
		}
		var log = (info ? Log.info : Log.debug);
		if (this.buffers.length === 0) {
			log("MultiBufferStream", "No more buffer in memory");
		} else {
			log("MultiBufferStream", ""+this.buffers.length+" stored buffer(s) ("+used+"/"+total+" bytes), continuous ranges: "+bufferedString);
		}
	};

	MultiBufferStream.prototype.cleanBuffers = function () {
		var i;
		var buffer;
		for (i = 0; i < this.buffers.length; i++) {
			buffer = this.buffers[i];
			if (buffer.usedBytes === buffer.byteLength) {
				Log.debug("MultiBufferStream", "Removing buffer #"+i);
				this.buffers.splice(i, 1);
				i--;
			}
		}
	};

	MultiBufferStream.prototype.mergeNextBuffer = function() {
		var next_buffer;
		if (this.bufferIndex+1 < this.buffers.length) {
			next_buffer = this.buffers[this.bufferIndex+1];
			if (next_buffer.fileStart === this.buffer.fileStart + this.buffer.byteLength) {
				var oldLength = this.buffer.byteLength;
				var oldUsedBytes = this.buffer.usedBytes;
				var oldFileStart = this.buffer.fileStart;
				this.buffers[this.bufferIndex] = ArrayBuffer.concat(this.buffer, next_buffer);
				this.buffer = this.buffers[this.bufferIndex];
				this.buffers.splice(this.bufferIndex+1, 1);
				this.buffer.usedBytes = oldUsedBytes; /* TODO: should it be += ? */
				this.buffer.fileStart = oldFileStart;
				Log.debug("ISOFile", "Concatenating buffer for box parsing (length: "+oldLength+"->"+this.buffer.byteLength+")");
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	};


	/*************************************************************************
	  Seek-related functions
	 *************************************************************************/

	/**
	 * Finds the buffer that holds the given file position
	 * @param  {Boolean} fromStart    indicates if the search should start from the current buffer (false) 
	 *                                or from the first buffer (true)
	 * @param  {Number}  filePosition position in the file to seek to
	 * @param  {Boolean} markAsUsed   indicates if the bytes in between the current position and the seek position 
	 *                                should be marked as used for garbage collection
	 * @return {Number}               the index of the buffer holding the seeked file position, -1 if not found.
	 */
	MultiBufferStream.prototype.findPosition = function(fromStart, filePosition, markAsUsed) {
		var i;
		var abuffer = null;
		var index = -1;

		/* find the buffer with the largest position smaller than the given position */
		if (fromStart === true) {
		   /* the reposition can be in the past, we need to check from the beginning of the list of buffers */
			i = 0;
		} else {
			i = this.bufferIndex;
		}

		while (i < this.buffers.length) {
			abuffer = this.buffers[i];
			if (abuffer.fileStart <= filePosition) {
				index = i;
				if (markAsUsed) {
					if (abuffer.fileStart + abuffer.byteLength <= filePosition) {
						abuffer.usedBytes = abuffer.byteLength;	
					} else {
						abuffer.usedBytes = filePosition - abuffer.fileStart;
					}		
					this.logBufferLevel();	
				}
			} else {
				break;
			}
			i++;
		}

		if (index !== -1) {
			abuffer = this.buffers[index];
			if (abuffer.fileStart + abuffer.byteLength >= filePosition) {			
				Log.debug("MultiBufferStream", "Found position in existing buffer #"+index);
				return index;
			} else {
				return -1;
			}
		} else {
			return -1;
		}
	};

	/**
	 * Finds the largest file position contained in a buffer or in the next buffers if they are contiguous (no gap)
	 * starting from the given buffer index or from the current buffer if the index is not given
	 *
	 * @param  {Number} inputindex Index of the buffer to start from
	 * @return {Number}            The largest file position found in the buffers
	 */
	MultiBufferStream.prototype.findEndContiguousBuf = function(inputindex) {
		var i;
		var currentBuf;
		var nextBuf;
		var index = (inputindex !== undefined ? inputindex : this.bufferIndex);
		currentBuf = this.buffers[index];
		/* find the end of the contiguous range of data */
		if (this.buffers.length > index+1) {
			for (i = index+1; i < this.buffers.length; i++) {
				nextBuf = this.buffers[i];
				if (nextBuf.fileStart === currentBuf.fileStart + currentBuf.byteLength) {
					currentBuf = nextBuf;
				} else {
					break;
				}
			}
		}
		/* return the position of last byte in the file that we have */
		return currentBuf.fileStart + currentBuf.byteLength;
	};

	/**
	 * Returns the largest file position contained in the buffers, larger than the given position
	 * @param  {Number} pos the file position to start from
	 * @return {Number}     the largest position in the current buffer or in the buffer and the next contiguous 
	 *                      buffer that holds the given position
	 */
	MultiBufferStream.prototype.getEndFilePositionAfter = function(pos) {
		var index = this.findPosition(true, pos, false);
		if (index !== -1) {
			return this.findEndContiguousBuf(index);
		} else {
			return pos;
		}
	};

	/*************************************************************************
	  Garbage collection related functions
	 *************************************************************************/

	/**
	 * Marks a given number of bytes as used in the current buffer for garbage collection
	 * @param {Number} nbBytes 
	 */
	MultiBufferStream.prototype.addUsedBytes = function(nbBytes) {
		this.buffer.usedBytes += nbBytes;
		this.logBufferLevel();
	};

	/**
	 * Marks the entire current buffer as used, ready for garbage collection
	 */
	MultiBufferStream.prototype.setAllUsedBytes = function() {
		this.buffer.usedBytes = this.buffer.byteLength;
		this.logBufferLevel();
	};

	/*************************************************************************
	  Common API between MultiBufferStream and SimpleStream
	 *************************************************************************/

	/**
	 * Tries to seek to a given file position
	 * if possible, repositions the parsing from there and returns true 
	 * if not possible, does not change anything and returns false 
	 * @param  {Number}  filePosition position in the file to seek to
	 * @param  {Boolean} fromStart    indicates if the search should start from the current buffer (false) 
	 *                                or from the first buffer (true)
	 * @param  {Boolean} markAsUsed   indicates if the bytes in between the current position and the seek position 
	 *                                should be marked as used for garbage collection
	 * @return {Boolean}              true if the seek succeeded, false otherwise
	 */
	MultiBufferStream.prototype.seek = function(filePosition, fromStart, markAsUsed) {
		var index;
		index = this.findPosition(fromStart, filePosition, markAsUsed);
		if (index !== -1) {
			this.buffer = this.buffers[index];
			this.bufferIndex = index;
			this.position = filePosition - this.buffer.fileStart;
			Log.debug("MultiBufferStream", "Repositioning parser at buffer position: "+this.position);
			return true;
		} else {
			Log.debug("MultiBufferStream", "Position "+filePosition+" not found in buffered data");
			return false;
		}
	};

	/**
	 * Returns the current position in the file
	 * @return {Number} the position in the file
	 */
	MultiBufferStream.prototype.getPosition = function() {
		if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === null) {
			throw "Error accessing position in the MultiBufferStream";
		}
		return this.buffers[this.bufferIndex].fileStart+this.position;
	};

	/**
	 * Returns the length of the current buffer
	 * @return {Number} the length of the current buffer
	 */
	MultiBufferStream.prototype.getLength = function() {
		return this.byteLength;
	};

	MultiBufferStream.prototype.getEndPosition = function() {
		if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === null) {
			throw "Error accessing position in the MultiBufferStream";
		}
		return this.buffers[this.bufferIndex].fileStart+this.byteLength;
	};

	{
		exports$1.MultiBufferStream = MultiBufferStream;
	}// file:src/descriptor.js
	/*
	 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	var MPEG4DescriptorParser = function () {
		var ES_DescrTag 			= 0x03;
		var DecoderConfigDescrTag 	= 0x04;
		var DecSpecificInfoTag 		= 0x05;
		var SLConfigDescrTag 		= 0x06;

		var descTagToName = [];
		descTagToName[ES_DescrTag] 				= "ES_Descriptor";
		descTagToName[DecoderConfigDescrTag] 	= "DecoderConfigDescriptor";
		descTagToName[DecSpecificInfoTag] 		= "DecoderSpecificInfo";
		descTagToName[SLConfigDescrTag] 		= "SLConfigDescriptor";

		this.getDescriptorName = function(tag) {
			return descTagToName[tag];
		};

		var that = this;
		var classes = {};

		this.parseOneDescriptor = function (stream) {
			var size = 0;
			var tag;
			var desc;
			var byteRead;
			tag = stream.readUint8();
			byteRead = stream.readUint8();
			while (byteRead & 0x80) {
				size = (byteRead & 0x7F)<<7;
				byteRead = stream.readUint8();
			}
			size += byteRead & 0x7F;
			Log.debug("MPEG4DescriptorParser", "Found "+(descTagToName[tag] || "Descriptor "+tag)+", size "+size+" at position "+stream.getPosition());
			if (descTagToName[tag]) {
				desc = new classes[descTagToName[tag]](size);
			} else {
				desc = new classes.Descriptor(size);
			}
			desc.parse(stream);
			return desc;
		};

		classes.Descriptor = function(_tag, _size) {
			this.tag = _tag;
			this.size = _size;
			this.descs = [];
		};

		classes.Descriptor.prototype.parse = function (stream) {
			this.data = stream.readUint8Array(this.size);
		};

		classes.Descriptor.prototype.findDescriptor = function (tag) {
			for (var i = 0; i < this.descs.length; i++) {
				if (this.descs[i].tag == tag) {
					return this.descs[i];
				}
			}
			return null;
		};

		classes.Descriptor.prototype.parseRemainingDescriptors = function (stream) {
			var start = stream.position;
			while (stream.position < start+this.size) {
				var desc = that.parseOneDescriptor(stream);
				this.descs.push(desc);
			}
		};

		classes.ES_Descriptor = function (size) {
			classes.Descriptor.call(this, ES_DescrTag, size);
		};

		classes.ES_Descriptor.prototype = new classes.Descriptor();

		classes.ES_Descriptor.prototype.parse = function(stream) {
			this.ES_ID = stream.readUint16();
			this.flags = stream.readUint8();
			this.size -= 3;
			if (this.flags & 0x80) {
				this.dependsOn_ES_ID = stream.readUint16();
				this.size -= 2;
			} else {
				this.dependsOn_ES_ID = 0;
			}
			if (this.flags & 0x40) {
				var l = stream.readUint8();
				this.URL = stream.readString(l);
				this.size -= l+1;
			} else {
				this.URL = "";
			}
			if (this.flags & 0x20) {
				this.OCR_ES_ID = stream.readUint16();
				this.size -= 2;
			} else {
				this.OCR_ES_ID = 0;
			}
			this.parseRemainingDescriptors(stream);
		};

		classes.ES_Descriptor.prototype.getOTI = function(stream) {
			var dcd = this.findDescriptor(DecoderConfigDescrTag);
			if (dcd) {
				return dcd.oti;
			} else {
				return 0;
			}
		};

		classes.ES_Descriptor.prototype.getAudioConfig = function(stream) {
			var dcd = this.findDescriptor(DecoderConfigDescrTag);
			if (!dcd) return null;
			var dsi = dcd.findDescriptor(DecSpecificInfoTag);
			if (dsi && dsi.data) {
				var audioObjectType = (dsi.data[0]& 0xF8) >> 3;
				if (audioObjectType === 31 && dsi.data.length >= 2) {
					audioObjectType = 32 + ((dsi.data[0] & 0x7) << 3) + ((dsi.data[1] & 0xE0) >> 5);
				}
				return audioObjectType;
			} else {
				return null;
			}
		};

		classes.DecoderConfigDescriptor = function (size) {
			classes.Descriptor.call(this, DecoderConfigDescrTag, size);
		};
		classes.DecoderConfigDescriptor.prototype = new classes.Descriptor();

		classes.DecoderConfigDescriptor.prototype.parse = function(stream) {
			this.oti = stream.readUint8();
			this.streamType = stream.readUint8();
			this.upStream = ((this.streamType >> 1) & 1) !== 0;
			this.streamType = this.streamType >>> 2;
			this.bufferSize = stream.readUint24();
			this.maxBitrate = stream.readUint32();
			this.avgBitrate = stream.readUint32();
			this.size -= 13;
			this.parseRemainingDescriptors(stream);
		};

		classes.DecoderSpecificInfo = function (size) {
			classes.Descriptor.call(this, DecSpecificInfoTag, size);
		};
		classes.DecoderSpecificInfo.prototype = new classes.Descriptor();

		classes.SLConfigDescriptor = function (size) {
			classes.Descriptor.call(this, SLConfigDescrTag, size);
		};
		classes.SLConfigDescriptor.prototype = new classes.Descriptor();

		return this;
	};

	{
		exports$1.MPEG4DescriptorParser = MPEG4DescriptorParser;
	}
	// file:src/box.js
	/*
	 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	var BoxParser = {
		ERR_INVALID_DATA : -1,
		ERR_NOT_ENOUGH_DATA : 0,
		OK : 1,

		// Boxes to be created with default parsing
		BASIC_BOXES: [ "mdat", "idat", "free", "skip", "meco", "strk" ],
		FULL_BOXES: [ "hmhd", "nmhd", "iods", "xml ", "bxml", "ipro", "mere" ],
		CONTAINER_BOXES: [
			[ "moov", [ "trak", "pssh" ] ],
			[ "trak" ],
			[ "edts" ],
			[ "mdia" ],
			[ "minf" ],
			[ "dinf" ],
			[ "stbl", [ "sgpd", "sbgp" ] ],
			[ "mvex", [ "trex" ] ],
			[ "moof", [ "traf" ] ],
			[ "traf", [ "trun", "sgpd", "sbgp" ] ],
			[ "vttc" ],
			[ "tref" ],
			[ "iref" ],
			[ "mfra", [ "tfra" ] ],
			[ "meco" ],
			[ "hnti" ],
			[ "hinf" ],
			[ "strk" ],
			[ "strd" ],
			[ "sinf" ],
			[ "rinf" ],
			[ "schi" ],
			[ "trgr" ],
			[ "udta", ["kind"] ],
			[ "iprp", ["ipma"] ],
			[ "ipco" ],
			[ "grpl" ],
			[ "j2kH" ],
			[ "etyp", [ "tyco"] ]
		],
		// Boxes effectively created
		boxCodes : [],
		fullBoxCodes : [],
		containerBoxCodes : [],
		sampleEntryCodes : {},
		sampleGroupEntryCodes: [],
		trackGroupTypes: [],
		UUIDBoxes: {},
		UUIDs: [],
		initialize: function() {
			BoxParser.FullBox.prototype = new BoxParser.Box();
			BoxParser.ContainerBox.prototype = new BoxParser.Box();
			BoxParser.SampleEntry.prototype = new BoxParser.Box();
			BoxParser.TrackGroupTypeBox.prototype = new BoxParser.FullBox();

			/* creating constructors for simple boxes */
			BoxParser.BASIC_BOXES.forEach(function(type) {
				BoxParser.createBoxCtor(type);
			});
			BoxParser.FULL_BOXES.forEach(function(type) {
				BoxParser.createFullBoxCtor(type);
			});
			BoxParser.CONTAINER_BOXES.forEach(function(types) {
				BoxParser.createContainerBoxCtor(types[0], null, types[1]);
			});
		},
		Box: function(_type, _size, _uuid) {
			this.type = _type;
			this.size = _size;
			this.uuid = _uuid;
		},
		FullBox: function(type, size, uuid) {
			BoxParser.Box.call(this, type, size, uuid);
			this.flags = 0;
			this.version = 0;
		},
		ContainerBox: function(type, size, uuid) {
			BoxParser.Box.call(this, type, size, uuid);
			this.boxes = [];
		},
		SampleEntry: function(type, size, hdr_size, start) {
			BoxParser.ContainerBox.call(this, type, size);
			this.hdr_size = hdr_size;
			this.start = start;
		},
		SampleGroupEntry: function(type) {
			this.grouping_type = type;
		},
		TrackGroupTypeBox: function(type, size) {
			BoxParser.FullBox.call(this, type, size);
		},
		createBoxCtor: function(type, parseMethod){
			BoxParser.boxCodes.push(type);
			BoxParser[type+"Box"] = function(size) {
				BoxParser.Box.call(this, type, size);
			};
			BoxParser[type+"Box"].prototype = new BoxParser.Box();
			if (parseMethod) BoxParser[type+"Box"].prototype.parse = parseMethod;
		},
		createFullBoxCtor: function(type, parseMethod) {
			//BoxParser.fullBoxCodes.push(type);
			BoxParser[type+"Box"] = function(size) {
				BoxParser.FullBox.call(this, type, size);
			};
			BoxParser[type+"Box"].prototype = new BoxParser.FullBox();
			BoxParser[type+"Box"].prototype.parse = function(stream) {
				this.parseFullHeader(stream);
				if (parseMethod) {
					parseMethod.call(this, stream);
				}
			};
		},
		addSubBoxArrays: function(subBoxNames) {
			if (subBoxNames) {
				this.subBoxNames = subBoxNames;
				var nbSubBoxes = subBoxNames.length;
				for (var k = 0; k<nbSubBoxes; k++) {
					this[subBoxNames[k]+"s"] = [];
				}
			}
		},
		createContainerBoxCtor: function(type, parseMethod, subBoxNames) {
			//BoxParser.containerBoxCodes.push(type);
			BoxParser[type+"Box"] = function(size) {
				BoxParser.ContainerBox.call(this, type, size);
				BoxParser.addSubBoxArrays.call(this, subBoxNames);
			};
			BoxParser[type+"Box"].prototype = new BoxParser.ContainerBox();
			if (parseMethod) BoxParser[type+"Box"].prototype.parse = parseMethod;
		},
		createMediaSampleEntryCtor: function(mediaType, parseMethod, subBoxNames) {
			BoxParser.sampleEntryCodes[mediaType] = [];
			BoxParser[mediaType+"SampleEntry"] = function(type, size) {
				BoxParser.SampleEntry.call(this, type, size);
				BoxParser.addSubBoxArrays.call(this, subBoxNames);
			};
			BoxParser[mediaType+"SampleEntry"].prototype = new BoxParser.SampleEntry();
			if (parseMethod) BoxParser[mediaType+"SampleEntry"].prototype .parse = parseMethod;
		},
		createSampleEntryCtor: function(mediaType, type, parseMethod, subBoxNames) {
			BoxParser.sampleEntryCodes[mediaType].push(type);
			BoxParser[type+"SampleEntry"] = function(size) {
				BoxParser[mediaType+"SampleEntry"].call(this, type, size);
				BoxParser.addSubBoxArrays.call(this, subBoxNames);
			};
			BoxParser[type+"SampleEntry"].prototype = new BoxParser[mediaType+"SampleEntry"]();
			if (parseMethod) BoxParser[type+"SampleEntry"].prototype.parse = parseMethod;
		},
		createEncryptedSampleEntryCtor: function(mediaType, type, parseMethod) {
			BoxParser.createSampleEntryCtor.call(this, mediaType, type, parseMethod, ["sinf"]);
		},
		createSampleGroupCtor: function(type, parseMethod) {
			//BoxParser.sampleGroupEntryCodes.push(type);
			BoxParser[type+"SampleGroupEntry"] = function(size) {
				BoxParser.SampleGroupEntry.call(this, type, size);
			};
			BoxParser[type+"SampleGroupEntry"].prototype = new BoxParser.SampleGroupEntry();
			if (parseMethod) BoxParser[type+"SampleGroupEntry"].prototype.parse = parseMethod;
		},
		createTrackGroupCtor: function(type, parseMethod) {
			//BoxParser.trackGroupTypes.push(type);
			BoxParser[type+"TrackGroupTypeBox"] = function(size) {
				BoxParser.TrackGroupTypeBox.call(this, type, size);
			};
			BoxParser[type+"TrackGroupTypeBox"].prototype = new BoxParser.TrackGroupTypeBox();
			if (parseMethod) BoxParser[type+"TrackGroupTypeBox"].prototype.parse = parseMethod;
		},
		createUUIDBox: function(uuid, isFullBox, isContainerBox, parseMethod) {
			BoxParser.UUIDs.push(uuid);
			BoxParser.UUIDBoxes[uuid] = function(size) {
				if (isFullBox) {
					BoxParser.FullBox.call(this, "uuid", size, uuid);
				} else {
					if (isContainerBox) {
						BoxParser.ContainerBox.call(this, "uuid", size, uuid);
					} else {
						BoxParser.Box.call(this, "uuid", size, uuid);
					}
				}
			};
			BoxParser.UUIDBoxes[uuid].prototype = (isFullBox ? new BoxParser.FullBox() : (isContainerBox ? new BoxParser.ContainerBox() : new BoxParser.Box()));
			if (parseMethod) {
				if (isFullBox) {
					BoxParser.UUIDBoxes[uuid].prototype.parse = function(stream) {
						this.parseFullHeader(stream);
						if (parseMethod) {
							parseMethod.call(this, stream);
						}
					};
				} else {
					BoxParser.UUIDBoxes[uuid].prototype.parse = parseMethod;
				}
			}
		}
	};

	BoxParser.initialize();

	BoxParser.TKHD_FLAG_ENABLED    = 0x000001;
	BoxParser.TKHD_FLAG_IN_MOVIE   = 0x000002;
	BoxParser.TKHD_FLAG_IN_PREVIEW = 0x000004;

	BoxParser.TFHD_FLAG_BASE_DATA_OFFSET	= 0x01;
	BoxParser.TFHD_FLAG_SAMPLE_DESC			= 0x02;
	BoxParser.TFHD_FLAG_SAMPLE_DUR			= 0x08;
	BoxParser.TFHD_FLAG_SAMPLE_SIZE			= 0x10;
	BoxParser.TFHD_FLAG_SAMPLE_FLAGS		= 0x20;
	BoxParser.TFHD_FLAG_DUR_EMPTY			= 0x10000;
	BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF= 0x20000;

	BoxParser.TRUN_FLAGS_DATA_OFFSET= 0x01;
	BoxParser.TRUN_FLAGS_FIRST_FLAG	= 0x04;
	BoxParser.TRUN_FLAGS_DURATION	= 0x100;
	BoxParser.TRUN_FLAGS_SIZE		= 0x200;
	BoxParser.TRUN_FLAGS_FLAGS		= 0x400;
	BoxParser.TRUN_FLAGS_CTS_OFFSET	= 0x800;

	BoxParser.Box.prototype.add = function(name) {
		return this.addBox(new BoxParser[name+"Box"]());
	};

	BoxParser.Box.prototype.addBox = function(box) {
		this.boxes.push(box);
		if (this[box.type+"s"]) {
			this[box.type+"s"].push(box);
		} else {
			this[box.type] = box;
		}
		return box;
	};

	BoxParser.Box.prototype.set = function(prop, value) {
		this[prop] = value;
		return this;
	};

	BoxParser.Box.prototype.addEntry = function(value, _prop) {
		var prop = _prop || "entries";
		if (!this[prop]) {
			this[prop] = [];
		}
		this[prop].push(value);
		return this;
	};

	{
		exports$1.BoxParser = BoxParser;
	}
	// file:src/box-parse.js
	/* 
	 * Copyright (c) Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	BoxParser.parseUUID = function(stream) {
		return BoxParser.parseHex16(stream);
	};

	BoxParser.parseHex16 = function(stream) {
		var hex16 = "";
		for (var i = 0; i <16; i++) {
			var hex = stream.readUint8().toString(16);
			hex16 += (hex.length === 1 ? "0"+hex : hex);
		}
		return hex16;
	};

	BoxParser.parseOneBox = function(stream, headerOnly, parentSize) {
		var box;
		var start = stream.getPosition();
		var hdr_size = 0;
		var diff;
		var uuid;
		if (stream.getEndPosition() - start < 8) {
			Log.debug("BoxParser", "Not enough data in stream to parse the type and size of the box");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
		}
		if (parentSize && parentSize < 8) {
			Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a new box");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
		}
		var size = stream.readUint32();
		var type = stream.readString(4);
		var box_type = type;
		Log.debug("BoxParser", "Found box of type '"+type+"' and size "+size+" at position "+start);
		hdr_size = 8;
		if (type == "uuid") {
			if ((stream.getEndPosition() - stream.getPosition() < 16) || (parentSize -hdr_size < 16)) {
				stream.seek(start);
				Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a UUID box");
				return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
			}
			uuid = BoxParser.parseUUID(stream);
			hdr_size += 16;
			box_type = uuid;
		}
		if (size == 1) {
			if ((stream.getEndPosition() - stream.getPosition() < 8) || (parentSize && (parentSize - hdr_size) < 8)) {
				stream.seek(start);
				Log.warn("BoxParser", "Not enough data in stream to parse the extended size of the \""+type+"\" box");
				return { code: BoxParser.ERR_NOT_ENOUGH_DATA };
			}
			size = stream.readUint64();
			hdr_size += 8;
		} else if (size === 0) {
			/* box extends till the end of file or invalid file */
			if (parentSize) {
				size = parentSize;
			} else {
				/* box extends till the end of file */
				if (type !== "mdat") {
					Log.error("BoxParser", "Unlimited box size not supported for type: '"+type+"'");
					box = new BoxParser.Box(type, size);
					return { code: BoxParser.OK, box: box, size: box.size };
				}
			}
		}
		if (size !== 0 && size < hdr_size) {
			Log.error("BoxParser", "Box of type "+type+" has an invalid size "+size+" (too small to be a box)");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA, type: type, size: size, hdr_size: hdr_size, start: start };
		}
		if (size !== 0 && parentSize && size > parentSize) {
			Log.error("BoxParser", "Box of type '"+type+"' has a size "+size+" greater than its container size "+parentSize);
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA, type: type, size: size, hdr_size: hdr_size, start: start };
		}
		if (size !== 0 && start + size > stream.getEndPosition()) {
			stream.seek(start);
			Log.info("BoxParser", "Not enough data in stream to parse the entire '"+type+"' box");
			return { code: BoxParser.ERR_NOT_ENOUGH_DATA, type: type, size: size, hdr_size: hdr_size, start: start };
		}
		if (headerOnly) {
			return { code: BoxParser.OK, type: type, size: size, hdr_size: hdr_size, start: start };
		} else {
			if (BoxParser[type+"Box"]) {
				box = new BoxParser[type+"Box"](size);
			} else {
				if (type !== "uuid") {
					Log.warn("BoxParser", "Unknown box type: '"+type+"'");
					box = new BoxParser.Box(type, size);
					box.has_unparsed_data = true;
				} else {
					if (BoxParser.UUIDBoxes[uuid]) {
						box = new BoxParser.UUIDBoxes[uuid](size);
					} else {
						Log.warn("BoxParser", "Unknown uuid type: '"+uuid+"'");
						box = new BoxParser.Box(type, size);
						box.uuid = uuid;
						box.has_unparsed_data = true;
					}
				}
			}
		}
		box.hdr_size = hdr_size;
		/* recording the position of the box in the input stream */
		box.start = start;
		if (box.write === BoxParser.Box.prototype.write && box.type !== "mdat") {
			Log.info("BoxParser", "'"+box_type+"' box writing not yet implemented, keeping unparsed data in memory for later write");
			box.parseDataAndRewind(stream);
		}
		box.parse(stream);
		diff = stream.getPosition() - (box.start+box.size);
		if (diff < 0) {
			Log.warn("BoxParser", "Parsing of box '"+box_type+"' did not read the entire indicated box data size (missing "+(-diff)+" bytes), seeking forward");
			stream.seek(box.start+box.size);
		} else if (diff > 0) {
			Log.error("BoxParser", "Parsing of box '"+box_type+"' read "+diff+" more bytes than the indicated box data size, seeking backwards");
			if (box.size !== 0) stream.seek(box.start+box.size);
		}
		return { code: BoxParser.OK, box: box, size: box.size };
	};

	BoxParser.Box.prototype.parse = function(stream) {
		if (this.type != "mdat") {
			this.data = stream.readUint8Array(this.size-this.hdr_size);
		} else {
			if (this.size === 0) {
				stream.seek(stream.getEndPosition());
			} else {
				stream.seek(this.start+this.size);
			}
		}
	};

	/* Used to parse a box without consuming its data, to allow detailled parsing
	   Useful for boxes for which a write method is not yet implemented */
	BoxParser.Box.prototype.parseDataAndRewind = function(stream) {
		this.data = stream.readUint8Array(this.size-this.hdr_size);
		// rewinding
		stream.position -= this.size-this.hdr_size;
	};

	BoxParser.FullBox.prototype.parseDataAndRewind = function(stream) {
		this.parseFullHeader(stream);
		this.data = stream.readUint8Array(this.size-this.hdr_size);
		// restore the header size as if the full header had not been parsed
		this.hdr_size -= 4;
		// rewinding
		stream.position -= this.size-this.hdr_size;
	};

	BoxParser.FullBox.prototype.parseFullHeader = function (stream) {
		this.version = stream.readUint8();
		this.flags = stream.readUint24();
		this.hdr_size += 4;
	};

	BoxParser.FullBox.prototype.parse = function (stream) {
		this.parseFullHeader(stream);
		this.data = stream.readUint8Array(this.size-this.hdr_size);
	};

	BoxParser.ContainerBox.prototype.parse = function(stream) {
		var ret;
		var box;
		while (stream.getPosition() < this.start+this.size) {
			ret = BoxParser.parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				box = ret.box;
				/* store the box in the 'boxes' array to preserve box order (for offset) but also store box in a property for more direct access */
				this.boxes.push(box);
				if (this.subBoxNames && this.subBoxNames.indexOf(box.type) != -1) {
					this[this.subBoxNames[this.subBoxNames.indexOf(box.type)]+"s"].push(box);
				} else {
					var box_type = box.type !== "uuid" ? box.type : box.uuid;
					if (this[box_type]) {
						Log.warn("Box of type "+box_type+" already stored in field of this type");
					} else {
						this[box_type] = box;
					}
				}
			} else {
				return;
			}
		}
	};

	BoxParser.Box.prototype.parseLanguage = function(stream) {
		this.language = stream.readUint16();
		var chars = [];
		chars[0] = (this.language>>10)&0x1F;
		chars[1] = (this.language>>5)&0x1F;
		chars[2] = (this.language)&0x1F;
		this.languageString = String.fromCharCode(chars[0]+0x60, chars[1]+0x60, chars[2]+0x60);
	};

	// file:src/parsing/sampleentries/sampleentry.js
	BoxParser.SAMPLE_ENTRY_TYPE_VISUAL 		= "Visual";
	BoxParser.SAMPLE_ENTRY_TYPE_AUDIO 		= "Audio";
	BoxParser.SAMPLE_ENTRY_TYPE_HINT 		= "Hint";
	BoxParser.SAMPLE_ENTRY_TYPE_METADATA 	= "Metadata";
	BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE 	= "Subtitle";
	BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM 		= "System";
	BoxParser.SAMPLE_ENTRY_TYPE_TEXT 		= "Text";

	BoxParser.SampleEntry.prototype.parseHeader = function(stream) {
		stream.readUint8Array(6);
		this.data_reference_index = stream.readUint16();
		this.hdr_size += 8;
	};

	BoxParser.SampleEntry.prototype.parse = function(stream) {
		this.parseHeader(stream);
		this.data = stream.readUint8Array(this.size - this.hdr_size);
	};

	BoxParser.SampleEntry.prototype.parseDataAndRewind = function(stream) {
		this.parseHeader(stream);
		this.data = stream.readUint8Array(this.size - this.hdr_size);
		// restore the header size as if the sample entry header had not been parsed
		this.hdr_size -= 8;
		// rewinding
		stream.position -= this.size-this.hdr_size;
	};

	BoxParser.SampleEntry.prototype.parseFooter = function(stream) {
		BoxParser.ContainerBox.prototype.parse.call(this, stream);
	};

	// Base SampleEntry types with default parsing
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_HINT);
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA);
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE);
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM);
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_TEXT);

	//Base SampleEntry types for Audio and Video with specific parsing
	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, function(stream) {
		var compressorname_length;
		this.parseHeader(stream);
		stream.readUint16();
		stream.readUint16();
		stream.readUint32Array(3);
		this.width = stream.readUint16();
		this.height = stream.readUint16();
		this.horizresolution = stream.readUint32();
		this.vertresolution = stream.readUint32();
		stream.readUint32();
		this.frame_count = stream.readUint16();
		compressorname_length = Math.min(31, stream.readUint8());
		this.compressorname = stream.readString(compressorname_length);
		if (compressorname_length < 31) {
			stream.readString(31 - compressorname_length);
		}
		this.depth = stream.readUint16();
		stream.readUint16();
		this.parseFooter(stream);
	});

	BoxParser.createMediaSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, function(stream) {
		this.parseHeader(stream);
		stream.readUint32Array(2);
		this.channel_count = stream.readUint16();
		this.samplesize = stream.readUint16();
		stream.readUint16();
		stream.readUint16();
		this.samplerate = (stream.readUint32()/(1<<16));
		this.parseFooter(stream);
	});

	// Sample entries inheriting from Audio and Video
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc2");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc3");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avc4");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "av01");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dav1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hvc1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hev1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "hvt1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "lhe1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dvh1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "dvhe");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvc1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvi1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvs1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vvcN");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vp08");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "vp09");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "avs3");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "j2ki");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "mjp2");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, "mjpg");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL,	"uncv");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"mp4a");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"ac-3");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"ac-4");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"ec-3");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"Opus");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"mha1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"mha2");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"mhm1");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"mhm2");
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"fLaC");

	// Encrypted sample entries
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_VISUAL, 	"encv");
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_AUDIO, 	"enca");
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, 	"encu");
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SYSTEM, 	"encs");
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_TEXT, 		"enct");
	BoxParser.createEncryptedSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, 	"encm");
	// file:src/parsing/a1lx.js
	BoxParser.createBoxCtor("a1lx", function(stream) {
		var large_size = stream.readUint8() & 1;
		var FieldLength = ((large_size & 1) + 1) * 16;
		this.layer_size = [];
		for (var i = 0; i < 3; i++) {
			if (FieldLength == 16) {
				this.layer_size[i] = stream.readUint16();
			} else {
				this.layer_size[i] = stream.readUint32();
			}
		}
	});// file:src/parsing/a1op.js
	BoxParser.createBoxCtor("a1op", function(stream) {
		this.op_index = stream.readUint8();
	});// file:src/parsing/auxC.js
	BoxParser.createFullBoxCtor("auxC", function(stream) {
		this.aux_type = stream.readCString();
		var aux_subtype_length = this.size - this.hdr_size - (this.aux_type.length + 1);
		this.aux_subtype = stream.readUint8Array(aux_subtype_length);
	});// file:src/parsing/av1C.js
	BoxParser.createBoxCtor("av1C", function(stream) {
		var tmp = stream.readUint8();
		if ((tmp >> 7) & 0x1 !== 1) {
			Log.error("av1C marker problem");
			return;
		}
		this.version = tmp & 0x7F;
		if (this.version !== 1) {
			Log.error("av1C version "+this.version+" not supported");
			return;
		}
		tmp = stream.readUint8();
		this.seq_profile = (tmp >> 5) & 0x7;
		this.seq_level_idx_0 = tmp & 0x1F;
		tmp = stream.readUint8();
		this.seq_tier_0 = (tmp >> 7) & 0x1;
		this.high_bitdepth = (tmp >> 6) & 0x1;
		this.twelve_bit = (tmp >> 5) & 0x1;
		this.monochrome = (tmp >> 4) & 0x1;
		this.chroma_subsampling_x = (tmp >> 3) & 0x1;
		this.chroma_subsampling_y = (tmp >> 2) & 0x1;
		this.chroma_sample_position = (tmp & 0x3);
		tmp = stream.readUint8();
		this.reserved_1 = (tmp >> 5) & 0x7;
		if (this.reserved_1 !== 0) {
			Log.error("av1C reserved_1 parsing problem");
			return;
		}
		this.initial_presentation_delay_present = (tmp >> 4) & 0x1;
		if (this.initial_presentation_delay_present === 1) {
			this.initial_presentation_delay_minus_one = (tmp & 0xF);
		} else {
			this.reserved_2 = (tmp & 0xF);
			if (this.reserved_2 !== 0) {
				Log.error("av1C reserved_2 parsing problem");
				return;
			}
		}

		var configOBUs_length = this.size - this.hdr_size - 4;
		this.configOBUs = stream.readUint8Array(configOBUs_length);
	});

	// file:src/parsing/avcC.js
	BoxParser.createBoxCtor("avcC", function(stream) {
		var i;
		var toparse;
		this.configurationVersion = stream.readUint8();
		this.AVCProfileIndication = stream.readUint8();
		this.profile_compatibility = stream.readUint8();
		this.AVCLevelIndication = stream.readUint8();
		this.lengthSizeMinusOne = (stream.readUint8() & 0x3);
		this.nb_SPS_nalus = (stream.readUint8() & 0x1F);
		toparse = this.size - this.hdr_size - 6;
		this.SPS = [];
		for (i = 0; i < this.nb_SPS_nalus; i++) {
			this.SPS[i] = {};
			this.SPS[i].length = stream.readUint16();
			this.SPS[i].nalu = stream.readUint8Array(this.SPS[i].length);
			toparse -= 2+this.SPS[i].length;
		}
		this.nb_PPS_nalus = stream.readUint8();
		toparse--;
		this.PPS = [];
		for (i = 0; i < this.nb_PPS_nalus; i++) {
			this.PPS[i] = {};
			this.PPS[i].length = stream.readUint16();
			this.PPS[i].nalu = stream.readUint8Array(this.PPS[i].length);
			toparse -= 2+this.PPS[i].length;
		}
		if (toparse>0) {
			this.ext = stream.readUint8Array(toparse);
		}
	});

	// file:src/parsing/btrt.js
	BoxParser.createBoxCtor("btrt", function(stream) {
		this.bufferSizeDB = stream.readUint32();
		this.maxBitrate = stream.readUint32();
		this.avgBitrate = stream.readUint32();
	});

	// file:src/parsing/ccst.js
	BoxParser.createFullBoxCtor("ccst", function(stream) {
		var flags = stream.readUint8();
		this.all_ref_pics_intra = ((flags & 0x80) == 0x80);
		this.intra_pred_used = ((flags & 0x40) == 0x40);
		this.max_ref_per_pic = ((flags & 0x3f) >> 2);
		stream.readUint24();
	});

	// file:src/parsing/cdef.js
	BoxParser.createBoxCtor("cdef", function(stream) {
	    var i;
	    this.channel_count = stream.readUint16();
	    this.channel_indexes = [];
	    this.channel_types = [];
	    this.channel_associations = [];
	    for (i = 0; i < this.channel_count; i++) {
	        this.channel_indexes.push(stream.readUint16());
	        this.channel_types.push(stream.readUint16());
	        this.channel_associations.push(stream.readUint16());
	    }
	});

	// file:src/parsing/clap.js
	BoxParser.createBoxCtor("clap", function(stream) {
		this.cleanApertureWidthN = stream.readUint32();
		this.cleanApertureWidthD = stream.readUint32();
		this.cleanApertureHeightN = stream.readUint32();
		this.cleanApertureHeightD = stream.readUint32();
		this.horizOffN = stream.readUint32();
		this.horizOffD = stream.readUint32();
		this.vertOffN = stream.readUint32();
		this.vertOffD = stream.readUint32();
	});// file:src/parsing/clli.js
	BoxParser.createBoxCtor("clli", function(stream) {
		this.max_content_light_level = stream.readUint16();
	    this.max_pic_average_light_level = stream.readUint16();
	});

	// file:src/parsing/cmex.js
	BoxParser.createFullBoxCtor("cmex", function(stream) {
		if (this.flags & 0x1) {
			this.pos_x = stream.readInt32();
		}
		if (this.flags & 0x2) {
			this.pos_y = stream.readInt32();
		}
		if (this.flags & 0x4) {
			this.pos_z = stream.readInt32();
		}
		if (this.flags & 0x8) {
			if (this.version == 0) {
				if (this.flags & 0x10) {
					this.quat_x = stream.readInt32();
					this.quat_y = stream.readInt32();
					this.quat_z = stream.readInt32();
				} else {
					this.quat_x = stream.readInt16();
					this.quat_y = stream.readInt16();
					this.quat_z = stream.readInt16();
				}
			} else if (this.version == 1) ;
		}
		if (this.flags & 0x20) {
			this.id = stream.readUint32();
		}
	});
	// file:src/parsing/cmin.js
	BoxParser.createFullBoxCtor("cmin", function(stream) {
		this.focal_length_x = stream.readInt32();
		this.principal_point_x = stream.readInt32();
		this.principal_point_y = stream.readInt32();
		if (this.flags & 0x1) {
			this.focal_length_y = stream.readInt32();
			this.skew_factor = stream.readInt32();
		}
	});// file:src/parsing/cmpd.js
	BoxParser.createBoxCtor("cmpd", function(stream) {
		this.component_count = stream.readUint32();
		this.component_types = [];
		this.component_type_urls = [];
		for (i = 0; i < this.component_count; i++) {
			var component_type = stream.readUint16();
			this.component_types.push(component_type);
			if (component_type >= 0x8000) {
				this.component_type_urls.push(stream.readCString());
			}
		}
	});// file:src/parsing/co64.js
	BoxParser.createFullBoxCtor("co64", function(stream) {
		var entry_count;
		var i;
		entry_count = stream.readUint32();
		this.chunk_offsets = [];
		if (this.version === 0) {
			for(i=0; i<entry_count; i++) {
				this.chunk_offsets.push(stream.readUint64());
			}
		}
	});

	// file:src/parsing/CoLL.js
	BoxParser.createFullBoxCtor("CoLL", function(stream) {
		this.maxCLL = stream.readUint16();
	    this.maxFALL = stream.readUint16();
	});

	// file:src/parsing/colr.js
	BoxParser.createBoxCtor("colr", function(stream) {
		this.colour_type = stream.readString(4);
		if (this.colour_type === 'nclx') {
			this.colour_primaries = stream.readUint16();
			this.transfer_characteristics = stream.readUint16();
			this.matrix_coefficients = stream.readUint16();
			var tmp = stream.readUint8();
			this.full_range_flag = tmp >> 7;
		} else if (this.colour_type === 'rICC') {
			this.ICC_profile = stream.readUint8Array(this.size - 4);
		} else if (this.colour_type === 'prof') {
			this.ICC_profile = stream.readUint8Array(this.size - 4);
		}
	});// file:src/parsing/cprt.js
	BoxParser.createFullBoxCtor("cprt", function (stream) {
		this.parseLanguage(stream);
		this.notice = stream.readCString();
	});

	// file:src/parsing/cslg.js
	BoxParser.createFullBoxCtor("cslg", function(stream) {
		if (this.version === 0) {
			this.compositionToDTSShift = stream.readInt32(); /* signed */
			this.leastDecodeToDisplayDelta = stream.readInt32(); /* signed */
			this.greatestDecodeToDisplayDelta = stream.readInt32(); /* signed */
			this.compositionStartTime = stream.readInt32(); /* signed */
			this.compositionEndTime = stream.readInt32(); /* signed */
		}
	});

	// file:src/parsing/ctts.js
	BoxParser.createFullBoxCtor("ctts", function(stream) {
		var entry_count;
		var i;
		entry_count = stream.readUint32();
		this.sample_counts = [];
		this.sample_offsets = [];
		if (this.version === 0) {
			for(i=0; i<entry_count; i++) {
				this.sample_counts.push(stream.readUint32());
				/* some files are buggy and declare version=0 while using signed offsets.
				   The likelyhood of using the most significant bit in a 32-bits time offset is very low,
				   so using signed value here as well */
				   var value = stream.readInt32();
				   if (value < 0) {
				   		Log.warn("BoxParser", "ctts box uses negative values without using version 1");
				   }
				this.sample_offsets.push(value);
			}
		} else if (this.version == 1) {
			for(i=0; i<entry_count; i++) {
				this.sample_counts.push(stream.readUint32());
				this.sample_offsets.push(stream.readInt32()); /* signed */
			}
		}
	});

	// file:src/parsing/dac3.js
	BoxParser.createBoxCtor("dac3", function(stream) {
		var tmp_byte1 = stream.readUint8();
		var tmp_byte2 = stream.readUint8();
		var tmp_byte3 = stream.readUint8();
		this.fscod = tmp_byte1 >> 6;
		this.bsid  = ((tmp_byte1 >> 1) & 0x1F);
		this.bsmod = ((tmp_byte1 & 0x1) <<  2) | ((tmp_byte2 >> 6) & 0x3);
		this.acmod = ((tmp_byte2 >> 3) & 0x7);
		this.lfeon = ((tmp_byte2 >> 2) & 0x1);
		this.bit_rate_code = (tmp_byte2 & 0x3) | ((tmp_byte3 >> 5) & 0x7);
	});

	// file:src/parsing/dec3.js
	BoxParser.createBoxCtor("dec3", function(stream) {
		var tmp_16 = stream.readUint16();
		this.data_rate = tmp_16 >> 3;
		this.num_ind_sub = tmp_16 & 0x7;
		this.ind_subs = [];
		for (var i = 0; i < this.num_ind_sub+1; i++) {
			var ind_sub = {};
			this.ind_subs.push(ind_sub);
			var tmp_byte1 = stream.readUint8();
			var tmp_byte2 = stream.readUint8();
			var tmp_byte3 = stream.readUint8();
			ind_sub.fscod = tmp_byte1 >> 6;
			ind_sub.bsid  = ((tmp_byte1 >> 1) & 0x1F);
			ind_sub.bsmod = ((tmp_byte1 & 0x1) << 4) | ((tmp_byte2 >> 4) & 0xF);
			ind_sub.acmod = ((tmp_byte2 >> 1) & 0x7);
			ind_sub.lfeon = (tmp_byte2 & 0x1);
			ind_sub.num_dep_sub = ((tmp_byte3 >> 1) & 0xF);
			if (ind_sub.num_dep_sub > 0) {
				ind_sub.chan_loc = ((tmp_byte3 & 0x1) << 8) | stream.readUint8();
			}
		}
	});

	// file:src/parsing/dfLa.js
	BoxParser.createFullBoxCtor("dfLa", function(stream) {
	    var BLOCKTYPE_MASK = 0x7F;
	    var LASTMETADATABLOCKFLAG_MASK = 0x80;

	    var boxesFound = [];
	    var knownBlockTypes = [
	        "STREAMINFO",
	        "PADDING",
	        "APPLICATION",
	        "SEEKTABLE",
	        "VORBIS_COMMENT",
	        "CUESHEET",
	        "PICTURE",
	        "RESERVED"
	    ];

	    // for (i=0; ; i++) { // to end of box
	    do {
	        var flagAndType = stream.readUint8();

	        var type = Math.min(
	            (flagAndType & BLOCKTYPE_MASK),
	            (knownBlockTypes.length - 1)
	        );

	        // if this is a STREAMINFO block, read the true samplerate since this
	        // can be different to the AudioSampleEntry samplerate.
	        if (!(type)) {
	            // read past all the other stuff
	            stream.readUint8Array(13);

	            // extract samplerate
	            this.samplerate = (stream.readUint32() >> 12);

	            // read to end of STREAMINFO
	            stream.readUint8Array(20);
	        } else {
	            // not interested in other block types so just discard length bytes
	            stream.readUint8Array(stream.readUint24());
	        }

	        boxesFound.push(knownBlockTypes[type]);

	        if (!!(flagAndType & LASTMETADATABLOCKFLAG_MASK)) {
	            break;
	        }
	    } while (true);

	    this.numMetadataBlocks =
	        boxesFound.length + " (" + boxesFound.join(", ") + ")";
	});
	// file:src/parsing/dimm.js
	BoxParser.createBoxCtor("dimm", function(stream) {
		this.bytessent = stream.readUint64();
	});

	// file:src/parsing/dmax.js
	BoxParser.createBoxCtor("dmax", function(stream) {
		this.time = stream.readUint32();
	});

	// file:src/parsing/dmed.js
	BoxParser.createBoxCtor("dmed", function(stream) {
		this.bytessent = stream.readUint64();
	});

	// file:src/parsing/dOps.js
	BoxParser.createBoxCtor("dOps", function(stream) {
		this.Version = stream.readUint8();
		this.OutputChannelCount = stream.readUint8();
		this.PreSkip = stream.readUint16();
		this.InputSampleRate = stream.readUint32();
		this.OutputGain = stream.readInt16();
		this.ChannelMappingFamily = stream.readUint8();
		if (this.ChannelMappingFamily !== 0) {
			this.StreamCount = stream.readUint8();
			this.CoupledCount = stream.readUint8();
			this.ChannelMapping = [];
			for (var i = 0; i < this.OutputChannelCount; i++) {
				this.ChannelMapping[i] = stream.readUint8();
			}
		}
	});

	// file:src/parsing/dref.js
	BoxParser.createFullBoxCtor("dref", function(stream) {
		var ret;
		var box;
		this.entries = [];
		var entry_count = stream.readUint32();
		for (var i = 0; i < entry_count; i++) {
			ret = BoxParser.parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				box = ret.box;
				this.entries.push(box);
			} else {
				return;
			}
		}
	});

	// file:src/parsing/drep.js
	BoxParser.createBoxCtor("drep", function(stream) {
		this.bytessent = stream.readUint64();
	});

	// file:src/parsing/elng.js
	BoxParser.createFullBoxCtor("elng", function(stream) {
		this.extended_language = stream.readString(this.size-this.hdr_size);
	});

	// file:src/parsing/elst.js
	BoxParser.createFullBoxCtor("elst", function(stream) {
		this.entries = [];
		var entry_count = stream.readUint32();
		for (var i = 0; i < entry_count; i++) {
			var entry = {};
			this.entries.push(entry);
			if (this.version === 1) {
				entry.segment_duration = stream.readUint64();
				entry.media_time = stream.readInt64();
			} else {
				entry.segment_duration = stream.readUint32();
				entry.media_time = stream.readInt32();
			}
			entry.media_rate_integer = stream.readInt16();
			entry.media_rate_fraction = stream.readInt16();
		}
	});

	// file:src/parsing/emsg.js
	BoxParser.createFullBoxCtor("emsg", function(stream) {
		if (this.version == 1) {
			this.timescale 					= stream.readUint32();
			this.presentation_time 			= stream.readUint64();
			this.event_duration			 	= stream.readUint32();
			this.id 						= stream.readUint32();
			this.scheme_id_uri 				= stream.readCString();
			this.value 						= stream.readCString();
		} else {
			this.scheme_id_uri 				= stream.readCString();
			this.value 						= stream.readCString();
			this.timescale 					= stream.readUint32();
			this.presentation_time_delta 	= stream.readUint32();
			this.event_duration			 	= stream.readUint32();
			this.id 						= stream.readUint32();
		}
		var message_size = this.size - this.hdr_size - (4*4 + (this.scheme_id_uri.length+1) + (this.value.length+1));
		if (this.version == 1) {
			message_size -= 4;
		}
		this.message_data = stream.readUint8Array(message_size);
	});

	// file:src/parsing/EntityToGroup.js
	// ISO/IEC 14496-12:2022 Section 8.18.3 Entity to group box
	BoxParser.createEntityToGroupCtor = function(type, parseMethod) {
	    BoxParser[type+"Box"] = function(size) {
	        BoxParser.FullBox.call(this, type, size);
	    };
	    BoxParser[type+"Box"].prototype = new BoxParser.FullBox();
	    BoxParser[type+"Box"].prototype.parse = function(stream) {
	        this.parseFullHeader(stream);
	        if (parseMethod) {
	            parseMethod.call(this, stream);
	        } else {
	            this.group_id = stream.readUint32();
	            this.num_entities_in_group = stream.readUint32();
	            this.entity_ids = [];
	            for (i = 0; i < this.num_entities_in_group; i++) {
	                var entity_id = stream.readUint32();
	                this.entity_ids.push(entity_id);
	            }
	        }
	    };
	};

	// Auto exposure bracketing (ISO/IEC 23008-12:2022 Section 6.8.6.2.1)
	BoxParser.createEntityToGroupCtor("aebr");

	// Flash exposure bracketing (ISO/IEC 23008-12:2022 Section 6.8.6.5.1)
	BoxParser.createEntityToGroupCtor("afbr");

	// Album collection (ISO/IEC 23008-12:2022 Section 6.8.7.1)
	BoxParser.createEntityToGroupCtor("albc");

	// Alternative entity (ISO/IEC 14496-12:2022 Section 8.18.3.1)
	BoxParser.createEntityToGroupCtor("altr");

	// Burst image entity group (ISO/IEC 23008-12:2022 Section 6.8.2.2)
	BoxParser.createEntityToGroupCtor("brst");

	// Depth of field bracketing (ISO/IEC 23008-12:2022 Section 6.8.6.6.1)
	BoxParser.createEntityToGroupCtor("dobr");

	// Equivalent entity (ISO/IEC 23008-12:2022 Section 6.8.1.1)
	BoxParser.createEntityToGroupCtor("eqiv");

	// Favourites collection (ISO/IEC 23008-12:2022 Section 6.8.7.2)
	BoxParser.createEntityToGroupCtor("favc");

	// Focus bracketing (ISO/IEC 23008-12:2022 Section 6.8.6.4.1)
	BoxParser.createEntityToGroupCtor("fobr");

	// Audio to image entity group (ISO/IEC 23008-12:2022 Section 6.8.4)
	BoxParser.createEntityToGroupCtor("iaug");

	// Panorama (ISO/IEC 23008-12:2022 Section 6.8.8.1)
	BoxParser.createEntityToGroupCtor("pano");

	// Slideshow (ISO/IEC 23008-12:2022 Section 6.8.9.1)
	BoxParser.createEntityToGroupCtor("slid");

	// Stereo pair (ISO/IEC 23008-12:2022 Section 6.8.5)
	BoxParser.createEntityToGroupCtor("ster");

	// Time-synchronised capture entity group (ISO/IEC 23008-12:2022 Section 6.8.3)
	BoxParser.createEntityToGroupCtor("tsyn");

	// White balance bracketing (ISO/IEC 23008-12:2022 Section 6.8.6.3.1)
	BoxParser.createEntityToGroupCtor("wbbr");

	// Alternative entity (ISO/IEC 23008-12:2022 AMD1 Section 6.8.10)
	BoxParser.createEntityToGroupCtor("prgr");

	// Image Pyramid entity group (ISO/IEC 23008-12:20xx Section 6.8.11)
	BoxParser.createEntityToGroupCtor("pymd", function(stream) {
	    this.group_id = stream.readUint32();
	    this.num_entities_in_group = stream.readUint32();
	    this.entity_ids = [];
	    for (var i = 0; i < this.num_entities_in_group; i++) {
	        var entity_id = stream.readUint32();
	        this.entity_ids.push(entity_id);
	    }
	    
	    this.tile_size_x = stream.readUint16();
	    this.tile_size_y = stream.readUint16();
	    this.layer_binning = [];
	    this.tiles_in_layer_column_minus1 = [];
	    this.tiles_in_layer_row_minus1 = [];
	    for (i = 0; i < this.num_entities_in_group; i++) {
	        this.layer_binning[i] = stream.readUint16();
	        this.tiles_in_layer_row_minus1[i] = stream.readUint16();
	        this.tiles_in_layer_column_minus1[i] = stream.readUint16();
	    }
	});

	// file:src/parsing/esds.js
	BoxParser.createFullBoxCtor("esds", function(stream) {
		var esd_data = stream.readUint8Array(this.size-this.hdr_size);
		this.data = esd_data;
		if (typeof MPEG4DescriptorParser !== "undefined") {
			var esd_parser = new MPEG4DescriptorParser();
			this.esd = esd_parser.parseOneDescriptor(new DataStream(esd_data.buffer, 0, DataStream.BIG_ENDIAN));
		}
	});

	// file:src/parsing/fiel.js
	BoxParser.createBoxCtor("fiel", function(stream) {
		this.fieldCount = stream.readUint8();
		this.fieldOrdering = stream.readUint8();
	});

	// file:src/parsing/frma.js
	BoxParser.createBoxCtor("frma", function(stream) {
		this.data_format = stream.readString(4);
	});

	// file:src/parsing/ftyp.js
	BoxParser.createBoxCtor("ftyp", function(stream) {
		var toparse = this.size - this.hdr_size;
		this.major_brand = stream.readString(4);
		this.minor_version = stream.readUint32();
		toparse -= 8;
		this.compatible_brands = [];
		var i = 0;
		while (toparse>=4) {
			this.compatible_brands[i] = stream.readString(4);
			toparse -= 4;
			i++;
		}
	});

	// file:src/parsing/hdlr.js
	BoxParser.createFullBoxCtor("hdlr", function(stream) {
		if (this.version === 0) {
			stream.readUint32();
			this.handler = stream.readString(4);
			stream.readUint32Array(3);
			this.name = stream.readString(this.size-this.hdr_size-20);
			if (this.name[this.name.length-1]==='\0') {
				this.name = this.name.slice(0,-1);
			}
		}
	});

	// file:src/parsing/hvcC.js
	BoxParser.createBoxCtor("hvcC", function(stream) {
		var i, j;
		var length;
		var tmp_byte;
		this.configurationVersion = stream.readUint8();
		tmp_byte = stream.readUint8();
		this.general_profile_space = tmp_byte >> 6;
		this.general_tier_flag = (tmp_byte & 0x20) >> 5;
		this.general_profile_idc = (tmp_byte & 0x1F);
		this.general_profile_compatibility = stream.readUint32();
		this.general_constraint_indicator = stream.readUint8Array(6);
		this.general_level_idc = stream.readUint8();
		this.min_spatial_segmentation_idc = stream.readUint16() & 0xFFF;
		this.parallelismType = (stream.readUint8() & 0x3);
		this.chroma_format_idc = (stream.readUint8() & 0x3);
		this.bit_depth_luma_minus8 = (stream.readUint8() & 0x7);
		this.bit_depth_chroma_minus8 = (stream.readUint8() & 0x7);
		this.avgFrameRate = stream.readUint16();
		tmp_byte = stream.readUint8();
		this.constantFrameRate = (tmp_byte >> 6);
		this.numTemporalLayers = (tmp_byte & 0XD) >> 3;
		this.temporalIdNested = (tmp_byte & 0X4) >> 2;
		this.lengthSizeMinusOne = (tmp_byte & 0X3);

		this.nalu_arrays = [];
		var numOfArrays = stream.readUint8();
		for (i = 0; i < numOfArrays; i++) {
			var nalu_array = [];
			this.nalu_arrays.push(nalu_array);
			tmp_byte = stream.readUint8();
			nalu_array.completeness = (tmp_byte & 0x80) >> 7;
			nalu_array.nalu_type = tmp_byte & 0x3F;
			var numNalus = stream.readUint16();
			for (j = 0; j < numNalus; j++) {
				var nalu = {};
				nalu_array.push(nalu);
				length = stream.readUint16();
				nalu.data   = stream.readUint8Array(length);
			}
		}
	});

	// file:src/parsing/iinf.js
	BoxParser.createFullBoxCtor("iinf", function(stream) {
		var ret;
		if (this.version === 0) {
			this.entry_count = stream.readUint16();
		} else {
			this.entry_count = stream.readUint32();
		}
		this.item_infos = [];
		for (var i = 0; i < this.entry_count; i++) {
			ret = BoxParser.parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				if (ret.box.type !== "infe") {
					Log.error("BoxParser", "Expected 'infe' box, got "+ret.box.type);
				}
				this.item_infos[i] = ret.box;
			} else {
				return;
			}
		}
	});

	// file:src/parsing/iloc.js
	BoxParser.createFullBoxCtor("iloc", function(stream) {
		var byte;
		byte = stream.readUint8();
		this.offset_size = (byte >> 4) & 0xF;
		this.length_size = byte & 0xF;
		byte = stream.readUint8();
		this.base_offset_size = (byte >> 4) & 0xF;
		if (this.version === 1 || this.version === 2) {
			this.index_size = byte & 0xF;
		} else {
			this.index_size = 0;
			// reserved = byte & 0xF;
		}
		this.items = [];
		var item_count = 0;
		if (this.version < 2) {
			item_count = stream.readUint16();
		} else if (this.version === 2) {
			item_count = stream.readUint32();
		} else {
			throw "version of iloc box not supported";
		}
		for (var i = 0; i < item_count; i++) {
			var item = {};
			this.items.push(item);
			if (this.version < 2) {
				item.item_ID = stream.readUint16();
			} else if (this.version === 2) {
				item.item_ID = stream.readUint32();
			} else {
				throw "version of iloc box not supported";
			}
			if (this.version === 1 || this.version === 2) {
				item.construction_method = (stream.readUint16() & 0xF);
			} else {
				item.construction_method = 0;
			}
			item.data_reference_index = stream.readUint16();
			switch(this.base_offset_size) {
				case 0:
					item.base_offset = 0;
					break;
				case 4:
					item.base_offset = stream.readUint32();
					break;
				case 8:
					item.base_offset = stream.readUint64();
					break;
				default:
					throw "Error reading base offset size";
			}
			var extent_count = stream.readUint16();
			item.extents = [];
			for (var j=0; j < extent_count; j++) {
				var extent = {};
				item.extents.push(extent);
				if (this.version === 1 || this.version === 2) {
					switch(this.index_size) {
						case 0:
							extent.extent_index = 0;
							break;
						case 4:
							extent.extent_index = stream.readUint32();
							break;
						case 8:
							extent.extent_index = stream.readUint64();
							break;
						default:
							throw "Error reading extent index";
					}
				}
				switch(this.offset_size) {
					case 0:
						extent.extent_offset = 0;
						break;
					case 4:
						extent.extent_offset = stream.readUint32();
						break;
					case 8:
						extent.extent_offset = stream.readUint64();
						break;
					default:
						throw "Error reading extent index";
				}
				switch(this.length_size) {
					case 0:
						extent.extent_length = 0;
						break;
					case 4:
						extent.extent_length = stream.readUint32();
						break;
					case 8:
						extent.extent_length = stream.readUint64();
						break;
					default:
						throw "Error reading extent index";
				}
			}
		}
	});

	// file:src/parsing/imir.js
	BoxParser.createBoxCtor("imir", function(stream) {
		var tmp = stream.readUint8();
		this.reserved = tmp >> 7;
		this.axis = tmp & 1;
	});// file:src/parsing/infe.js
	BoxParser.createFullBoxCtor("infe", function(stream) {
		if (this.version === 0 || this.version === 1) {
			this.item_ID = stream.readUint16();
			this.item_protection_index = stream.readUint16();
			this.item_name = stream.readCString();
			this.content_type = stream.readCString();
			this.content_encoding = stream.readCString();
		}
		if (this.version === 1) {
			this.extension_type = stream.readString(4);
			Log.warn("BoxParser", "Cannot parse extension type");
			stream.seek(this.start+this.size);
			return;
		}
		if (this.version >= 2) {
			if (this.version === 2) {
				this.item_ID = stream.readUint16();
			} else if (this.version === 3) {
				this.item_ID = stream.readUint32();
			}
			this.item_protection_index = stream.readUint16();
			this.item_type = stream.readString(4);
			this.item_name = stream.readCString();
			if (this.item_type === "mime") {
				this.content_type = stream.readCString();
				this.content_encoding = stream.readCString();
			} else if (this.item_type === "uri ") {
				this.item_uri_type = stream.readCString();
			}
		}
	});
	// file:src/parsing/ipma.js
	BoxParser.createFullBoxCtor("ipma", function(stream) {
		var i, j;
		entry_count = stream.readUint32();
		this.associations = [];
		for(i=0; i<entry_count; i++) {
			var item_assoc = {};
			this.associations.push(item_assoc);
			if (this.version < 1) {
				item_assoc.id = stream.readUint16();
			} else {
				item_assoc.id = stream.readUint32();
			}
			var association_count = stream.readUint8();
			item_assoc.props = [];
			for (j = 0; j < association_count; j++) {
				var tmp = stream.readUint8();
				var p = {};
				item_assoc.props.push(p);
				p.essential = ((tmp & 0x80) >> 7) === 1;
				if (this.flags & 0x1) {
					p.property_index = (tmp & 0x7F) << 8 | stream.readUint8();
				} else {
					p.property_index = (tmp & 0x7F);
				}
			}
		}
	});

	// file:src/parsing/iref.js
	BoxParser.createFullBoxCtor("iref", function(stream) {
		var ret;
		var box;
		this.references = [];

		while (stream.getPosition() < this.start+this.size) {
			ret = BoxParser.parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				if (this.version === 0) {
					box = new BoxParser.SingleItemTypeReferenceBox(ret.type, ret.size, ret.hdr_size, ret.start);
				} else {
					box = new BoxParser.SingleItemTypeReferenceBoxLarge(ret.type, ret.size, ret.hdr_size, ret.start);
				}
				if (box.write === BoxParser.Box.prototype.write && box.type !== "mdat") {
					Log.warn("BoxParser", box.type+" box writing not yet implemented, keeping unparsed data in memory for later write");
					box.parseDataAndRewind(stream);
				}
				box.parse(stream);
				this.references.push(box);
			} else {
				return;
			}
		}
	});
	// file:src/parsing/irot.js
	BoxParser.createBoxCtor("irot", function(stream) {
		this.angle = stream.readUint8() & 0x3;
	});

	// file:src/parsing/ispe.js
	BoxParser.createFullBoxCtor("ispe", function(stream) {
		this.image_width = stream.readUint32();
		this.image_height = stream.readUint32();
	});// file:src/parsing/kind.js
	BoxParser.createFullBoxCtor("kind", function(stream) {
		this.schemeURI = stream.readCString();
		this.value = stream.readCString();
	});
	// file:src/parsing/leva.js
	BoxParser.createFullBoxCtor("leva", function(stream) {
		var count = stream.readUint8();
		this.levels = [];
		for (var i = 0; i < count; i++) {
			var level = {};
			this.levels[i] = level;
			level.track_ID = stream.readUint32();
			var tmp_byte = stream.readUint8();
			level.padding_flag = tmp_byte >> 7;
			level.assignment_type = tmp_byte & 0x7F;
			switch (level.assignment_type) {
				case 0:
					level.grouping_type = stream.readString(4);
					break;
				case 1:
					level.grouping_type = stream.readString(4);
					level.grouping_type_parameter = stream.readUint32();
					break;
				case 2:
					break;
				case 3:
					break;
				case 4:
					level.sub_track_id = stream.readUint32();
					break;
				default:
					Log.warn("BoxParser", "Unknown leva assignement type");
			}
		}
	});

	// file:src/parsing/lhvC.js
	BoxParser.createBoxCtor("lhvC", function(stream) {
		var i, j;
		var tmp_byte;
		this.configurationVersion = stream.readUint8();
		this.min_spatial_segmentation_idc = stream.readUint16() & 0xFFF;
		this.parallelismType = (stream.readUint8() & 0x3);
		tmp_byte = stream.readUint8();
		this.numTemporalLayers = (tmp_byte & 0XD) >> 3;
		this.temporalIdNested = (tmp_byte & 0X4) >> 2;
		this.lengthSizeMinusOne = (tmp_byte & 0X3);

		this.nalu_arrays = [];
		var numOfArrays = stream.readUint8();
		for (i = 0; i < numOfArrays; i++) {
			var nalu_array = [];
			this.nalu_arrays.push(nalu_array);
			tmp_byte = stream.readUint8();
			nalu_array.completeness = (tmp_byte & 0x80) >> 7;
			nalu_array.nalu_type = tmp_byte & 0x3F;
			var numNalus = stream.readUint16();
			for (j = 0; j < numNalus; j++) {
				var nalu = {};
				nalu_array.push(nalu);
				var length = stream.readUint16();
				nalu.data  = stream.readUint8Array(length);
			}
		}
	});

	// file:src/parsing/lsel.js
	BoxParser.createBoxCtor("lsel", function(stream) {
		this.layer_id = stream.readUint16();
	});// file:src/parsing/maxr.js
	BoxParser.createBoxCtor("maxr", function(stream) {
		this.period = stream.readUint32();
		this.bytes = stream.readUint32();
	});

	// file:src/parsing/mdcv.js
	function ColorPoint(x, y) {
	    this.x = x;
	    this.y = y;
	}

	ColorPoint.prototype.toString = function() {
	    return "("+this.x+","+this.y+")";
	};

	BoxParser.createBoxCtor("mdcv", function(stream) {
	    this.display_primaries = [];
	    this.display_primaries[0] = new ColorPoint(stream.readUint16(),stream.readUint16());
	    this.display_primaries[1] = new ColorPoint(stream.readUint16(),stream.readUint16());
	    this.display_primaries[2] = new ColorPoint(stream.readUint16(),stream.readUint16());
	    this.white_point = new ColorPoint(stream.readUint16(),stream.readUint16());
	    this.max_display_mastering_luminance = stream.readUint32();
	    this.min_display_mastering_luminance = stream.readUint32();
	});

	// file:src/parsing/mdhd.js
	BoxParser.createFullBoxCtor("mdhd", function(stream) {
		if (this.version == 1) {
			this.creation_time = stream.readUint64();
			this.modification_time = stream.readUint64();
			this.timescale = stream.readUint32();
			this.duration = stream.readUint64();
		} else {
			this.creation_time = stream.readUint32();
			this.modification_time = stream.readUint32();
			this.timescale = stream.readUint32();
			this.duration = stream.readUint32();
		}
		this.parseLanguage(stream);
		stream.readUint16();
	});

	// file:src/parsing/mehd.js
	BoxParser.createFullBoxCtor("mehd", function(stream) {
		if (this.flags & 0x1) {
			Log.warn("BoxParser", "mehd box incorrectly uses flags set to 1, converting version to 1");
			this.version = 1;
		}
		if (this.version == 1) {
			this.fragment_duration = stream.readUint64();
		} else {
			this.fragment_duration = stream.readUint32();
		}
	});

	// file:src/parsing/meta.js
	BoxParser.createFullBoxCtor("meta", function(stream) {
		this.boxes = [];
		BoxParser.ContainerBox.prototype.parse.call(this, stream);
	});
	// file:src/parsing/mfhd.js
	BoxParser.createFullBoxCtor("mfhd", function(stream) {
		this.sequence_number = stream.readUint32();
	});

	// file:src/parsing/mfro.js
	BoxParser.createFullBoxCtor("mfro", function(stream) {
		this._size = stream.readUint32();
	});

	// file:src/parsing/mskC.js
	BoxParser.createFullBoxCtor("mskC", function(stream) {
	    this.bits_per_pixel = stream.readUint8();
	});

	// file:src/parsing/mvhd.js
	BoxParser.createFullBoxCtor("mvhd", function(stream) {
		if (this.version == 1) {
			this.creation_time = stream.readUint64();
			this.modification_time = stream.readUint64();
			this.timescale = stream.readUint32();
			this.duration = stream.readUint64();
		} else {
			this.creation_time = stream.readUint32();
			this.modification_time = stream.readUint32();
			this.timescale = stream.readUint32();
			this.duration = stream.readUint32();
		}
		this.rate = stream.readUint32();
		this.volume = stream.readUint16()>>8;
		stream.readUint16();
		stream.readUint32Array(2);
		this.matrix = stream.readUint32Array(9);
		stream.readUint32Array(6);
		this.next_track_id = stream.readUint32();
	});
	// file:src/parsing/npck.js
	BoxParser.createBoxCtor("npck", function(stream) {
		this.packetssent = stream.readUint32();
	});

	// file:src/parsing/nump.js
	BoxParser.createBoxCtor("nump", function(stream) {
		this.packetssent = stream.readUint64();
	});

	// file:src/parsing/padb.js
	BoxParser.createFullBoxCtor("padb", function(stream) {
		var sample_count = stream.readUint32();
		this.padbits = [];
		for (var i = 0; i < Math.floor((sample_count+1)/2); i++) {
			this.padbits = stream.readUint8();
		}
	});

	// file:src/parsing/pasp.js
	BoxParser.createBoxCtor("pasp", function(stream) {
		this.hSpacing = stream.readUint32();
		this.vSpacing = stream.readUint32();
	});// file:src/parsing/payl.js
	BoxParser.createBoxCtor("payl", function(stream) {
		this.text = stream.readString(this.size - this.hdr_size);
	});

	// file:src/parsing/payt.js
	BoxParser.createBoxCtor("payt", function(stream) {
		this.payloadID = stream.readUint32();
		var count = stream.readUint8();
		this.rtpmap_string = stream.readString(count);
	});

	// file:src/parsing/pdin.js
	BoxParser.createFullBoxCtor("pdin", function(stream) {
		var count = (this.size - this.hdr_size)/8;
		this.rate = [];
		this.initial_delay = [];
		for (var i = 0; i < count; i++) {
			this.rate[i] = stream.readUint32();
			this.initial_delay[i] = stream.readUint32();
		}
	});

	// file:src/parsing/pitm.js
	BoxParser.createFullBoxCtor("pitm", function(stream) {
		if (this.version === 0) {
			this.item_id = stream.readUint16();
		} else {
			this.item_id = stream.readUint32();
		}
	});

	// file:src/parsing/pixi.js
	BoxParser.createFullBoxCtor("pixi", function(stream) {
		var i;
		this.num_channels = stream.readUint8();
		this.bits_per_channels = [];
		for (i = 0; i < this.num_channels; i++) {
			this.bits_per_channels[i] = stream.readUint8();
		}
	});

	// file:src/parsing/pmax.js
	BoxParser.createBoxCtor("pmax", function(stream) {
		this.bytes = stream.readUint32();
	});

	// file:src/parsing/prdi.js
	BoxParser.createFullBoxCtor("prdi", function(stream) {
		this.step_count = stream.readUint16();
		this.item_count = [];
		if (this.flags & 0x2) {
			for (var i = 0; i < this.step_count; i++) {
				this.item_count[i] = stream.readUint16();
			}
		}
	});// file:src/parsing/prft.js
	BoxParser.createFullBoxCtor("prft", function(stream) {
		this.ref_track_id = stream.readUint32();
		this.ntp_timestamp = stream.readUint64();
		if (this.version === 0) {
			this.media_time = stream.readUint32();
		} else {
			this.media_time = stream.readUint64();
		}
	});

	// file:src/parsing/pssh.js
	BoxParser.createFullBoxCtor("pssh", function(stream) {
		this.system_id = BoxParser.parseHex16(stream);
		if (this.version > 0) {
			var count = stream.readUint32();
			this.kid = [];
			for (var i = 0; i < count; i++) {
				this.kid[i] = BoxParser.parseHex16(stream);
			}
		}
		var datasize = stream.readUint32();
		if (datasize > 0) {
			this.data = stream.readUint8Array(datasize);
		}
	});

	// file:src/parsing/qt/clef.js
	BoxParser.createFullBoxCtor("clef", function(stream) {
		this.width = stream.readUint32();
		this.height = stream.readUint32();
	});// file:src/parsing/qt/enof.js
	BoxParser.createFullBoxCtor("enof", function(stream) {
		this.width = stream.readUint32();
		this.height = stream.readUint32();
	});// file:src/parsing/qt/prof.js
	BoxParser.createFullBoxCtor("prof", function(stream) {
		this.width = stream.readUint32();
		this.height = stream.readUint32();
	});// file:src/parsing/qt/tapt.js
	BoxParser.createContainerBoxCtor("tapt", null, [ "clef", "prof", "enof"]);// file:src/parsing/rtp.js
	BoxParser.createBoxCtor("rtp ", function(stream) {
		this.descriptionformat = stream.readString(4);
		this.sdptext = stream.readString(this.size - this.hdr_size - 4);
	});

	// file:src/parsing/saio.js
	BoxParser.createFullBoxCtor("saio", function(stream) {
		if (this.flags & 0x1) {
			this.aux_info_type = stream.readUint32();
			this.aux_info_type_parameter = stream.readUint32();
		}
		var count = stream.readUint32();
		this.offset = [];
		for (var i = 0; i < count; i++) {
			if (this.version === 0) {
				this.offset[i] = stream.readUint32();
			} else {
				this.offset[i] = stream.readUint64();
			}
		}
	});
	// file:src/parsing/saiz.js
	BoxParser.createFullBoxCtor("saiz", function(stream) {
		if (this.flags & 0x1) {
			this.aux_info_type = stream.readUint32();
			this.aux_info_type_parameter = stream.readUint32();
		}
		this.default_sample_info_size = stream.readUint8();
		var count = stream.readUint32();
		this.sample_info_size = [];
		if (this.default_sample_info_size === 0) {
			for (var i = 0; i < count; i++) {
				this.sample_info_size[i] = stream.readUint8();
			}
		}
	});

	// file:src/parsing/sampleentries/mett.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "mett", function(stream) {
		this.parseHeader(stream);
		this.content_encoding = stream.readCString();
		this.mime_format = stream.readCString();
		this.parseFooter(stream);
	});

	// file:src/parsing/sampleentries/metx.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "metx", function(stream) {
		this.parseHeader(stream);
		this.content_encoding = stream.readCString();
		this.namespace = stream.readCString();
		this.schema_location = stream.readCString();
		this.parseFooter(stream);
	});

	// file:src/parsing/sampleentries/sbtt.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "sbtt", function(stream) {
		this.parseHeader(stream);
		this.content_encoding = stream.readCString();
		this.mime_format = stream.readCString();
		this.parseFooter(stream);
	});

	// file:src/parsing/sampleentries/stpp.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "stpp", function(stream) {
		this.parseHeader(stream);
		this.namespace = stream.readCString();
		this.schema_location = stream.readCString();
		this.auxiliary_mime_types = stream.readCString();
		this.parseFooter(stream);
	});

	// file:src/parsing/sampleentries/stxt.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "stxt", function(stream) {
		this.parseHeader(stream);
		this.content_encoding = stream.readCString();
		this.mime_format = stream.readCString();
		this.parseFooter(stream);
	});

	// file:src/parsing/sampleentries/tx3g.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_SUBTITLE, "tx3g", function(stream) {
		this.parseHeader(stream);
		this.displayFlags = stream.readUint32();
		this.horizontal_justification = stream.readInt8();
		this.vertical_justification = stream.readInt8();
		this.bg_color_rgba = stream.readUint8Array(4);
		this.box_record = stream.readInt16Array(4);
		this.style_record = stream.readUint8Array(12);
		this.parseFooter(stream);
	});
	// file:src/parsing/sampleentries/wvtt.js
	BoxParser.createSampleEntryCtor(BoxParser.SAMPLE_ENTRY_TYPE_METADATA, "wvtt", function(stream) {
		this.parseHeader(stream);
		this.parseFooter(stream);
	});

	// file:src/parsing/samplegroups/alst.js
	BoxParser.createSampleGroupCtor("alst", function(stream) {
		var i;
		var roll_count = stream.readUint16();
		this.first_output_sample = stream.readUint16();
		this.sample_offset = [];
		for (i = 0; i < roll_count; i++) {
			this.sample_offset[i] = stream.readUint32();
		}
		var remaining = this.description_length - 4 - 4*roll_count;
		this.num_output_samples = [];
		this.num_total_samples = [];
		for (i = 0; i < remaining/4; i++) {
			this.num_output_samples[i] = stream.readUint16();
			this.num_total_samples[i] = stream.readUint16();
		}
	});

	// file:src/parsing/samplegroups/avll.js
	BoxParser.createSampleGroupCtor("avll", function(stream) {
		this.layerNumber = stream.readUint8();
		this.accurateStatisticsFlag = stream.readUint8();
		this.avgBitRate = stream.readUint16();
		this.avgFrameRate = stream.readUint16();
	});

	// file:src/parsing/samplegroups/avss.js
	BoxParser.createSampleGroupCtor("avss", function(stream) {
		this.subSequenceIdentifier = stream.readUint16();
		this.layerNumber = stream.readUint8();
		var tmp_byte = stream.readUint8();
		this.durationFlag = tmp_byte >> 7;
		this.avgRateFlag = (tmp_byte >> 6) & 0x1;
		if (this.durationFlag) {
			this.duration = stream.readUint32();
		}
		if (this.avgRateFlag) {
			this.accurateStatisticsFlag = stream.readUint8();
			this.avgBitRate = stream.readUint16();
			this.avgFrameRate = stream.readUint16();
		}
		this.dependency = [];
		var numReferences = stream.readUint8();
		for (var i = 0; i < numReferences; i++) {
			var dependencyInfo = {};
			this.dependency.push(dependencyInfo);
			dependencyInfo.subSeqDirectionFlag = stream.readUint8();
			dependencyInfo.layerNumber = stream.readUint8();
			dependencyInfo.subSequenceIdentifier = stream.readUint16();
		}
	});

	// file:src/parsing/samplegroups/dtrt.js
	BoxParser.createSampleGroupCtor("dtrt", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/mvif.js
	BoxParser.createSampleGroupCtor("mvif", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/prol.js
	BoxParser.createSampleGroupCtor("prol", function(stream) {
		this.roll_distance = stream.readInt16();
	});

	// file:src/parsing/samplegroups/rap.js
	BoxParser.createSampleGroupCtor("rap ", function(stream) {
		var tmp_byte = stream.readUint8();
		this.num_leading_samples_known = tmp_byte >> 7;
		this.num_leading_samples = tmp_byte & 0x7F;
	});

	// file:src/parsing/samplegroups/rash.js
	BoxParser.createSampleGroupCtor("rash", function(stream) {
		this.operation_point_count = stream.readUint16();
		if (this.description_length !== 2+(this.operation_point_count === 1?2:this.operation_point_count*6)+9) {
			Log.warn("BoxParser", "Mismatch in "+this.grouping_type+" sample group length");
			this.data =  stream.readUint8Array(this.description_length-2);
		} else {
			if (this.operation_point_count === 1) {
				this.target_rate_share = stream.readUint16();
			} else {
				this.target_rate_share = [];
				this.available_bitrate = [];
				for (var i = 0; i < this.operation_point_count; i++) {
					this.available_bitrate[i] = stream.readUint32();
					this.target_rate_share[i] = stream.readUint16();
				}
			}
			this.maximum_bitrate = stream.readUint32();
			this.minimum_bitrate = stream.readUint32();
			this.discard_priority = stream.readUint8();
		}
	});

	// file:src/parsing/samplegroups/roll.js
	BoxParser.createSampleGroupCtor("roll", function(stream) {
		this.roll_distance = stream.readInt16();
	});

	// file:src/parsing/samplegroups/samplegroup.js
	BoxParser.SampleGroupEntry.prototype.parse = function(stream) {
		Log.warn("BoxParser", "Unknown Sample Group type: "+this.grouping_type);
		this.data =  stream.readUint8Array(this.description_length);
	};

	// file:src/parsing/samplegroups/scif.js
	BoxParser.createSampleGroupCtor("scif", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/scnm.js
	BoxParser.createSampleGroupCtor("scnm", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/seig.js
	BoxParser.createSampleGroupCtor("seig", function(stream) {
		this.reserved = stream.readUint8();
		var tmp = stream.readUint8();
		this.crypt_byte_block = tmp >> 4;
		this.skip_byte_block = tmp & 0xF;
		this.isProtected = stream.readUint8();
		this.Per_Sample_IV_Size = stream.readUint8();
		this.KID = BoxParser.parseHex16(stream);
		this.constant_IV_size = 0;
		this.constant_IV = 0;
		if (this.isProtected === 1 && this.Per_Sample_IV_Size === 0) {
			this.constant_IV_size = stream.readUint8();
			this.constant_IV = stream.readUint8Array(this.constant_IV_size);
		}
	});

	// file:src/parsing/samplegroups/stsa.js
	BoxParser.createSampleGroupCtor("stsa", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/sync.js
	BoxParser.createSampleGroupCtor("sync", function(stream) {
		var tmp_byte = stream.readUint8();
		this.NAL_unit_type = tmp_byte & 0x3F;
	});

	// file:src/parsing/samplegroups/tele.js
	BoxParser.createSampleGroupCtor("tele", function(stream) {
		var tmp_byte = stream.readUint8();
		this.level_independently_decodable = tmp_byte >> 7;
	});

	// file:src/parsing/samplegroups/tsas.js
	BoxParser.createSampleGroupCtor("tsas", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/tscl.js
	BoxParser.createSampleGroupCtor("tscl", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/samplegroups/vipr.js
	BoxParser.createSampleGroupCtor("vipr", function(stream) {
		Log.warn("BoxParser", "Sample Group type: "+this.grouping_type+" not fully parsed");
	});

	// file:src/parsing/sbgp.js
	BoxParser.createFullBoxCtor("sbgp", function(stream) {
		this.grouping_type = stream.readString(4);
		if (this.version === 1) {
			this.grouping_type_parameter = stream.readUint32();
		} else {
			this.grouping_type_parameter = 0;
		}
		this.entries = [];
		var entry_count = stream.readUint32();
		for (var i = 0; i < entry_count; i++) {
			var entry = {};
			this.entries.push(entry);
			entry.sample_count = stream.readInt32();
			entry.group_description_index = stream.readInt32();
		}
	});

	// file:src/parsing/sbpm.js
	function Pixel(row, col) {
		this.bad_pixel_row = row;
		this.bad_pixel_column = col;
	}

	Pixel.prototype.toString = function pixelToString() {
		return "[row: " + this.bad_pixel_row + ", column: " + this.bad_pixel_column + "]";
	};

	BoxParser.createFullBoxCtor("sbpm", function(stream) {
		var i;
		this.component_count = stream.readUint16();
	    this.component_index = [];
	    for (i = 0; i < this.component_count; i++) {
	        this.component_index.push(stream.readUint16());
	    }
		var flags = stream.readUint8();
		this.correction_applied = (0x80 == (flags & 0x80));
		this.num_bad_rows = stream.readUint32();
		this.num_bad_cols = stream.readUint32();
		this.num_bad_pixels = stream.readUint32();
		this.bad_rows = [];
		this.bad_columns = [];
		this.bad_pixels = [];
		for (i = 0; i < this.num_bad_rows; i++) {
			this.bad_rows.push(stream.readUint32());
		}
		for (i = 0; i < this.num_bad_cols; i++) {
			this.bad_columns.push(stream.readUint32());
		}
		for (i = 0; i < this.num_bad_pixels; i++) {
			var row = stream.readUint32();
			var col = stream.readUint32();
			this.bad_pixels.push(new Pixel(row, col));
		}
	});

	// file:src/parsing/schm.js
	BoxParser.createFullBoxCtor("schm", function(stream) {
		this.scheme_type = stream.readString(4);
		this.scheme_version = stream.readUint32();
		if (this.flags & 0x000001) {
			this.scheme_uri = stream.readString(this.size - this.hdr_size - 8);
		}
	});

	// file:src/parsing/sdp.js
	BoxParser.createBoxCtor("sdp ", function(stream) {
		this.sdptext = stream.readString(this.size - this.hdr_size);
	});

	// file:src/parsing/sdtp.js
	BoxParser.createFullBoxCtor("sdtp", function(stream) {
		var tmp_byte;
		var count = (this.size - this.hdr_size);
		this.is_leading = [];
		this.sample_depends_on = [];
		this.sample_is_depended_on = [];
		this.sample_has_redundancy = [];
		for (var i = 0; i < count; i++) {
			tmp_byte = stream.readUint8();
			this.is_leading[i] = tmp_byte >> 6;
			this.sample_depends_on[i] = (tmp_byte >> 4) & 0x3;
			this.sample_is_depended_on[i] = (tmp_byte >> 2) & 0x3;
			this.sample_has_redundancy[i] = tmp_byte & 0x3;
		}
	});

	// file:src/parsing/senc.js
	// Cannot be fully parsed because Per_Sample_IV_Size needs to be known
	BoxParser.createFullBoxCtor("senc" /*, function(stream) {
		this.parseFullHeader(stream);
		var sample_count = stream.readUint32();
		this.samples = [];
		for (var i = 0; i < sample_count; i++) {
			var sample = {};
			// tenc.default_Per_Sample_IV_Size or seig.Per_Sample_IV_Size
			sample.InitializationVector = this.readUint8Array(Per_Sample_IV_Size*8);
			if (this.flags & 0x2) {
				sample.subsamples = [];
				subsample_count = stream.readUint16();
				for (var j = 0; j < subsample_count; j++) {
					var subsample = {};
					subsample.BytesOfClearData = stream.readUint16();
					subsample.BytesOfProtectedData = stream.readUint32();
					sample.subsamples.push(subsample);
				}
			}
			// TODO
			this.samples.push(sample);
		}
	}*/);
	// file:src/parsing/sgpd.js
	BoxParser.createFullBoxCtor("sgpd", function(stream) {
		this.grouping_type = stream.readString(4);
		Log.debug("BoxParser", "Found Sample Groups of type "+this.grouping_type);
		if (this.version === 1) {
			this.default_length = stream.readUint32();
		} else {
			this.default_length = 0;
		}
		if (this.version >= 2) {
			this.default_group_description_index = stream.readUint32();
		}
		this.entries = [];
		var entry_count = stream.readUint32();
		for (var i = 0; i < entry_count; i++) {
			var entry;
			if (BoxParser[this.grouping_type+"SampleGroupEntry"]) {
				entry = new BoxParser[this.grouping_type+"SampleGroupEntry"](this.grouping_type);
			}  else {
				entry = new BoxParser.SampleGroupEntry(this.grouping_type);
			}
			this.entries.push(entry);
			if (this.version === 1) {
				if (this.default_length === 0) {
					entry.description_length = stream.readUint32();
				} else {
					entry.description_length = this.default_length;
				}
			} else {
				entry.description_length = this.default_length;
			}
			if (entry.write === BoxParser.SampleGroupEntry.prototype.write) {
				Log.info("BoxParser", "SampleGroup for type "+this.grouping_type+" writing not yet implemented, keeping unparsed data in memory for later write");
				// storing data
				entry.data = stream.readUint8Array(entry.description_length);
				// rewinding
				stream.position -= entry.description_length;
			}
			entry.parse(stream);
		}
	});

	// file:src/parsing/sidx.js
	BoxParser.createFullBoxCtor("sidx", function(stream) {
		this.reference_ID = stream.readUint32();
		this.timescale = stream.readUint32();
		if (this.version === 0) {
			this.earliest_presentation_time = stream.readUint32();
			this.first_offset = stream.readUint32();
		} else {
			this.earliest_presentation_time = stream.readUint64();
			this.first_offset = stream.readUint64();
		}
		stream.readUint16();
		this.references = [];
		var count = stream.readUint16();
		for (var i = 0; i < count; i++) {
			var ref = {};
			this.references.push(ref);
			var tmp_32 = stream.readUint32();
			ref.reference_type = (tmp_32 >> 31) & 0x1;
			ref.referenced_size = tmp_32 & 0x7FFFFFFF;
			ref.subsegment_duration = stream.readUint32();
			tmp_32 = stream.readUint32();
			ref.starts_with_SAP = (tmp_32 >> 31) & 0x1;
			ref.SAP_type = (tmp_32 >> 28) & 0x7;
			ref.SAP_delta_time = tmp_32 & 0xFFFFFFF;
		}
	});

	// file:src/parsing/singleitemtypereference.js
	BoxParser.SingleItemTypeReferenceBox = function(type, size, hdr_size, start) {
		BoxParser.Box.call(this, type, size);
		this.hdr_size = hdr_size;
		this.start = start;
	};
	BoxParser.SingleItemTypeReferenceBox.prototype = new BoxParser.Box();
	BoxParser.SingleItemTypeReferenceBox.prototype.parse = function(stream) {
		this.from_item_ID = stream.readUint16();
		var count =  stream.readUint16();
		this.references = [];
		for(var i = 0; i < count; i++) {
			this.references[i] = {};
			this.references[i].to_item_ID = stream.readUint16();
		}
	};

	// file:src/parsing/singleitemtypereferencelarge.js
	BoxParser.SingleItemTypeReferenceBoxLarge = function(type, size, hdr_size, start) {
		BoxParser.Box.call(this, type, size);
		this.hdr_size = hdr_size;
		this.start = start;
	};
	BoxParser.SingleItemTypeReferenceBoxLarge.prototype = new BoxParser.Box();
	BoxParser.SingleItemTypeReferenceBoxLarge.prototype.parse = function(stream) {
		this.from_item_ID = stream.readUint32();
		var count =  stream.readUint16();
		this.references = [];
		for(var i = 0; i < count; i++) {
			this.references[i] = {};
			this.references[i].to_item_ID = stream.readUint32();
		}
	};

	// file:src/parsing/SmDm.js
	BoxParser.createFullBoxCtor("SmDm", function(stream) {
		this.primaryRChromaticity_x = stream.readUint16();
	    this.primaryRChromaticity_y = stream.readUint16();
	    this.primaryGChromaticity_x = stream.readUint16();
	    this.primaryGChromaticity_y = stream.readUint16();
	    this.primaryBChromaticity_x = stream.readUint16();
	    this.primaryBChromaticity_y = stream.readUint16();
	    this.whitePointChromaticity_x = stream.readUint16();
	    this.whitePointChromaticity_y = stream.readUint16();
	    this.luminanceMax = stream.readUint32();
	    this.luminanceMin = stream.readUint32();
	});

	// file:src/parsing/smhd.js
	BoxParser.createFullBoxCtor("smhd", function(stream) {
		this.balance = stream.readUint16();
		stream.readUint16();
	});

	// file:src/parsing/ssix.js
	BoxParser.createFullBoxCtor("ssix", function(stream) {
		this.subsegments = [];
		var subsegment_count = stream.readUint32();
		for (var i = 0; i < subsegment_count; i++) {
			var subsegment = {};
			this.subsegments.push(subsegment);
			subsegment.ranges = [];
			var range_count = stream.readUint32();
			for (var j = 0; j < range_count; j++) {
				var range = {};
				subsegment.ranges.push(range);
				range.level = stream.readUint8();
				range.range_size = stream.readUint24();
			}
		}
	});

	// file:src/parsing/stco.js
	BoxParser.createFullBoxCtor("stco", function(stream) {
		var entry_count;
		entry_count = stream.readUint32();
		this.chunk_offsets = [];
		if (this.version === 0) {
			for (var i = 0; i < entry_count; i++) {
				this.chunk_offsets.push(stream.readUint32());
			}
		}
	});

	// file:src/parsing/stdp.js
	BoxParser.createFullBoxCtor("stdp", function(stream) {
		var count = (this.size - this.hdr_size)/2;
		this.priority = [];
		for (var i = 0; i < count; i++) {
			this.priority[i] = stream.readUint16();
		}
	});

	// file:src/parsing/sthd.js
	BoxParser.createFullBoxCtor("sthd");

	// file:src/parsing/stri.js
	BoxParser.createFullBoxCtor("stri", function(stream) {
		this.switch_group = stream.readUint16();
		this.alternate_group = stream.readUint16();
		this.sub_track_id = stream.readUint32();
		var count = (this.size - this.hdr_size - 8)/4;
		this.attribute_list = [];
		for (var i = 0; i < count; i++) {
			this.attribute_list[i] = stream.readUint32();
		}
	});

	// file:src/parsing/stsc.js
	BoxParser.createFullBoxCtor("stsc", function(stream) {
		var entry_count;
		var i;
		entry_count = stream.readUint32();
		this.first_chunk = [];
		this.samples_per_chunk = [];
		this.sample_description_index = [];
		if (this.version === 0) {
			for(i=0; i<entry_count; i++) {
				this.first_chunk.push(stream.readUint32());
				this.samples_per_chunk.push(stream.readUint32());
				this.sample_description_index.push(stream.readUint32());
			}
		}
	});

	// file:src/parsing/stsd.js
	BoxParser.createFullBoxCtor("stsd", function(stream) {
		var i;
		var ret;
		var entryCount;
		var box;
		this.entries = [];
		entryCount = stream.readUint32();
		for (i = 1; i <= entryCount; i++) {
			ret = BoxParser.parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				if (BoxParser[ret.type+"SampleEntry"]) {
					box = new BoxParser[ret.type+"SampleEntry"](ret.size);
					box.hdr_size = ret.hdr_size;
					box.start = ret.start;
				} else {
					Log.warn("BoxParser", "Unknown sample entry type: "+ret.type);
					box = new BoxParser.SampleEntry(ret.type, ret.size, ret.hdr_size, ret.start);
				}
				if (box.write === BoxParser.SampleEntry.prototype.write) {
					Log.info("BoxParser", "SampleEntry "+box.type+" box writing not yet implemented, keeping unparsed data in memory for later write");
					box.parseDataAndRewind(stream);
				}
				box.parse(stream);
				this.entries.push(box);
			} else {
				return;
			}
		}
	});

	// file:src/parsing/stsg.js
	BoxParser.createFullBoxCtor("stsg", function(stream) {
		this.grouping_type = stream.readUint32();
		var count = stream.readUint16();
		this.group_description_index = [];
		for (var i = 0; i < count; i++) {
			this.group_description_index[i] = stream.readUint32();
		}
	});

	// file:src/parsing/stsh.js
	BoxParser.createFullBoxCtor("stsh", function(stream) {
		var entry_count;
		var i;
		entry_count = stream.readUint32();
		this.shadowed_sample_numbers = [];
		this.sync_sample_numbers = [];
		if (this.version === 0) {
			for(i=0; i<entry_count; i++) {
				this.shadowed_sample_numbers.push(stream.readUint32());
				this.sync_sample_numbers.push(stream.readUint32());
			}
		}
	});

	// file:src/parsing/stss.js
	BoxParser.createFullBoxCtor("stss", function(stream) {
		var i;
		var entry_count;
		entry_count = stream.readUint32();
		if (this.version === 0) {
			this.sample_numbers = [];
			for(i=0; i<entry_count; i++) {
				this.sample_numbers.push(stream.readUint32());
			}
		}
	});

	// file:src/parsing/stsz.js
	BoxParser.createFullBoxCtor("stsz", function(stream) {
		var i;
		this.sample_sizes = [];
		if (this.version === 0) {
			this.sample_size = stream.readUint32();
			this.sample_count = stream.readUint32();
			for (i = 0; i < this.sample_count; i++) {
				if (this.sample_size === 0) {
					this.sample_sizes.push(stream.readUint32());
				} else {
					this.sample_sizes[i] = this.sample_size;
				}
			}
		}
	});

	// file:src/parsing/stts.js
	BoxParser.createFullBoxCtor("stts", function(stream) {
		var entry_count;
		var i;
		var delta;
		entry_count = stream.readUint32();
		this.sample_counts = [];
		this.sample_deltas = [];
		if (this.version === 0) {
			for(i=0; i<entry_count; i++) {
				this.sample_counts.push(stream.readUint32());
				delta = stream.readInt32();
				if (delta < 0) {
					Log.warn("BoxParser", "File uses negative stts sample delta, using value 1 instead, sync may be lost!");
					delta = 1;
				}
				this.sample_deltas.push(delta);
			}
		}
	});

	// file:src/parsing/stvi.js
	BoxParser.createFullBoxCtor("stvi", function(stream) {
		var tmp32 = stream.readUint32();
		this.single_view_allowed = tmp32 & 0x3;
		this.stereo_scheme = stream.readUint32();
		var length = stream.readUint32();
		this.stereo_indication_type = stream.readString(length);
		var ret;
		var box;
		this.boxes = [];
		while (stream.getPosition() < this.start+this.size) {
			ret = BoxParser.parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				box = ret.box;
				this.boxes.push(box);
				this[box.type] = box;
			} else {
				return;
			}
		}
	});

	// file:src/parsing/styp.js
	BoxParser.createBoxCtor("styp", function(stream) {
		BoxParser.ftypBox.prototype.parse.call(this, stream);
	});

	// file:src/parsing/stz2.js
	BoxParser.createFullBoxCtor("stz2", function(stream) {
		var i;
		var sample_count;
		this.sample_sizes = [];
		if (this.version === 0) {
			this.reserved = stream.readUint24();
			this.field_size = stream.readUint8();
			sample_count = stream.readUint32();
			if (this.field_size === 4) {
				for (i = 0; i < sample_count; i+=2) {
					var tmp = stream.readUint8();
					this.sample_sizes[i] = (tmp >> 4) & 0xF;
					this.sample_sizes[i+1] = tmp & 0xF;
				}
			} else if (this.field_size === 8) {
				for (i = 0; i < sample_count; i++) {
					this.sample_sizes[i] = stream.readUint8();
				}
			} else if (this.field_size === 16) {
				for (i = 0; i < sample_count; i++) {
					this.sample_sizes[i] = stream.readUint16();
				}
			} else {
				Log.error("BoxParser", "Error in length field in stz2 box");
			}
		}
	});

	// file:src/parsing/subs.js
	BoxParser.createFullBoxCtor("subs", function(stream) {
		var i,j;
		var entry_count;
		var subsample_count;
		entry_count = stream.readUint32();
		this.entries = [];
		for (i = 0; i < entry_count; i++) {
			var sampleInfo = {};
			this.entries[i] = sampleInfo;
			sampleInfo.sample_delta = stream.readUint32();
			sampleInfo.subsamples = [];
			subsample_count = stream.readUint16();
			if (subsample_count>0) {
				for (j = 0; j < subsample_count; j++) {
					var subsample = {};
					sampleInfo.subsamples.push(subsample);
					if (this.version == 1) {
						subsample.size = stream.readUint32();
					} else {
						subsample.size = stream.readUint16();
					}
					subsample.priority = stream.readUint8();
					subsample.discardable = stream.readUint8();
					subsample.codec_specific_parameters = stream.readUint32();
				}
			}
		}
	});

	// file:src/parsing/tenc.js
	BoxParser.createFullBoxCtor("tenc", function(stream) {
		stream.readUint8(); // reserved
		if (this.version === 0) {
			stream.readUint8();
		} else {
			var tmp = stream.readUint8();
			this.default_crypt_byte_block = (tmp >> 4) & 0xF;
			this.default_skip_byte_block = tmp & 0xF;
		}
		this.default_isProtected = stream.readUint8();
		this.default_Per_Sample_IV_Size = stream.readUint8();
		this.default_KID = BoxParser.parseHex16(stream);
		if (this.default_isProtected === 1 && this.default_Per_Sample_IV_Size === 0) {
			this.default_constant_IV_size = stream.readUint8();
			this.default_constant_IV = stream.readUint8Array(this.default_constant_IV_size);
		}
	});// file:src/parsing/tfdt.js
	BoxParser.createFullBoxCtor("tfdt", function(stream) {
		if (this.version == 1) {
			this.baseMediaDecodeTime = stream.readUint64();
		} else {
			this.baseMediaDecodeTime = stream.readUint32();
		}
	});

	// file:src/parsing/tfhd.js
	BoxParser.createFullBoxCtor("tfhd", function(stream) {
		var readBytes = 0;
		this.track_id = stream.readUint32();
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET)) {
			this.base_data_offset = stream.readUint64();
			readBytes += 8;
		} else {
			this.base_data_offset = 0;
		}
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC)) {
			this.default_sample_description_index = stream.readUint32();
			readBytes += 4;
		} else {
			this.default_sample_description_index = 0;
		}
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR)) {
			this.default_sample_duration = stream.readUint32();
			readBytes += 4;
		} else {
			this.default_sample_duration = 0;
		}
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE)) {
			this.default_sample_size = stream.readUint32();
			readBytes += 4;
		} else {
			this.default_sample_size = 0;
		}
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS)) {
			this.default_sample_flags = stream.readUint32();
			readBytes += 4;
		} else {
			this.default_sample_flags = 0;
		}
	});

	// file:src/parsing/tfra.js
	BoxParser.createFullBoxCtor("tfra", function(stream) {
		this.track_ID = stream.readUint32();
		stream.readUint24();
		var tmp_byte = stream.readUint8();
		this.length_size_of_traf_num = (tmp_byte >> 4) & 0x3;
		this.length_size_of_trun_num = (tmp_byte >> 2) & 0x3;
		this.length_size_of_sample_num = (tmp_byte) & 0x3;
		this.entries = [];
		var number_of_entries = stream.readUint32();
		for (var i = 0; i < number_of_entries; i++) {
			if (this.version === 1) {
				this.time = stream.readUint64();
				this.moof_offset = stream.readUint64();
			} else {
				this.time = stream.readUint32();
				this.moof_offset = stream.readUint32();
			}
			this.traf_number = stream["readUint"+(8*(this.length_size_of_traf_num+1))]();
			this.trun_number = stream["readUint"+(8*(this.length_size_of_trun_num+1))]();
			this.sample_number = stream["readUint"+(8*(this.length_size_of_sample_num+1))]();
		}
	});

	// file:src/parsing/tkhd.js
	BoxParser.createFullBoxCtor("tkhd", function(stream) {
		if (this.version == 1) {
			this.creation_time = stream.readUint64();
			this.modification_time = stream.readUint64();
			this.track_id = stream.readUint32();
			stream.readUint32();
			this.duration = stream.readUint64();
		} else {
			this.creation_time = stream.readUint32();
			this.modification_time = stream.readUint32();
			this.track_id = stream.readUint32();
			stream.readUint32();
			this.duration = stream.readUint32();
		}
		stream.readUint32Array(2);
		this.layer = stream.readInt16();
		this.alternate_group = stream.readInt16();
		this.volume = stream.readInt16()>>8;
		stream.readUint16();
		this.matrix = stream.readInt32Array(9);
		this.width = stream.readUint32();
		this.height = stream.readUint32();
	});

	// file:src/parsing/tmax.js
	BoxParser.createBoxCtor("tmax", function(stream) {
		this.time = stream.readUint32();
	});

	// file:src/parsing/tmin.js
	BoxParser.createBoxCtor("tmin", function(stream) {
		this.time = stream.readUint32();
	});

	// file:src/parsing/totl.js
	BoxParser.createBoxCtor("totl",function(stream) {
		this.bytessent = stream.readUint32();
	});

	// file:src/parsing/tpay.js
	BoxParser.createBoxCtor("tpay", function(stream) {
		this.bytessent = stream.readUint32();
	});

	// file:src/parsing/tpyl.js
	BoxParser.createBoxCtor("tpyl", function(stream) {
		this.bytessent = stream.readUint64();
	});

	// file:src/parsing/TrackGroup.js
	BoxParser.TrackGroupTypeBox.prototype.parse = function(stream) {
		this.parseFullHeader(stream);
		this.track_group_id = stream.readUint32();
	};

	// file:src/parsing/trackgroups/msrc.js
	BoxParser.createTrackGroupCtor("msrc");// file:src/parsing/TrakReference.js
	BoxParser.TrackReferenceTypeBox = function(type, size, hdr_size, start) {
		BoxParser.Box.call(this, type, size);
		this.hdr_size = hdr_size;
		this.start = start;
	};
	BoxParser.TrackReferenceTypeBox.prototype = new BoxParser.Box();
	BoxParser.TrackReferenceTypeBox.prototype.parse = function(stream) {
		this.track_ids = stream.readUint32Array((this.size-this.hdr_size)/4);
	};

	// file:src/parsing/tref.js
	BoxParser.trefBox.prototype.parse = function(stream) {
		var ret;
		var box;
		while (stream.getPosition() < this.start+this.size) {
			ret = BoxParser.parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				box = new BoxParser.TrackReferenceTypeBox(ret.type, ret.size, ret.hdr_size, ret.start);
				if (box.write === BoxParser.Box.prototype.write && box.type !== "mdat") {
					Log.info("BoxParser", "TrackReference "+box.type+" box writing not yet implemented, keeping unparsed data in memory for later write");
					box.parseDataAndRewind(stream);
				}
				box.parse(stream);
				this.boxes.push(box);
			} else {
				return;
			}
		}
	};

	// file:src/parsing/trep.js
	BoxParser.createFullBoxCtor("trep", function(stream) {
		this.track_ID = stream.readUint32();
		this.boxes = [];
		while (stream.getPosition() < this.start+this.size) {
			ret = BoxParser.parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
			if (ret.code === BoxParser.OK) {
				box = ret.box;
				this.boxes.push(box);
			} else {
				return;
			}
		}
	});

	// file:src/parsing/trex.js
	BoxParser.createFullBoxCtor("trex", function(stream) {
		this.track_id = stream.readUint32();
		this.default_sample_description_index = stream.readUint32();
		this.default_sample_duration = stream.readUint32();
		this.default_sample_size = stream.readUint32();
		this.default_sample_flags = stream.readUint32();
	});

	// file:src/parsing/trpy.js
	BoxParser.createBoxCtor("trpy", function(stream) {
		this.bytessent = stream.readUint64();
	});

	// file:src/parsing/trun.js
	BoxParser.createFullBoxCtor("trun", function(stream) {
		var readBytes = 0;
		this.sample_count = stream.readUint32();
		readBytes+= 4;
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET) ) {
			this.data_offset = stream.readInt32(); //signed
			readBytes += 4;
		} else {
			this.data_offset = 0;
		}
		if (this.size - this.hdr_size > readBytes && (this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG) ) {
			this.first_sample_flags = stream.readUint32();
			readBytes += 4;
		} else {
			this.first_sample_flags = 0;
		}
		this.sample_duration = [];
		this.sample_size = [];
		this.sample_flags = [];
		this.sample_composition_time_offset = [];
		if (this.size - this.hdr_size > readBytes) {
			for (var i = 0; i < this.sample_count; i++) {
				if (this.flags & BoxParser.TRUN_FLAGS_DURATION) {
					this.sample_duration[i] = stream.readUint32();
				}
				if (this.flags & BoxParser.TRUN_FLAGS_SIZE) {
					this.sample_size[i] = stream.readUint32();
				}
				if (this.flags & BoxParser.TRUN_FLAGS_FLAGS) {
					this.sample_flags[i] = stream.readUint32();
				}
				if (this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET) {
					if (this.version === 0) {
						this.sample_composition_time_offset[i] = stream.readUint32();
					} else {
						this.sample_composition_time_offset[i] = stream.readInt32(); //signed
					}
				}
			}
		}
	});

	// file:src/parsing/tsel.js
	BoxParser.createFullBoxCtor("tsel", function(stream) {
		this.switch_group = stream.readUint32();
		var count = (this.size - this.hdr_size - 4)/4;
		this.attribute_list = [];
		for (var i = 0; i < count; i++) {
			this.attribute_list[i] = stream.readUint32();
		}
	});

	// file:src/parsing/txtC.js
	BoxParser.createFullBoxCtor("txtC", function(stream) {
		this.config = stream.readCString();
	});

	// file:src/parsing/tyco.js
	BoxParser.createBoxCtor("tyco", function(stream) {
		var count = (this.size - this.hdr_size) / 4;
		this.compatible_brands = [];
		for (var i = 0; i < count; i++) {
			this.compatible_brands[i] = stream.readString(4);
		}
	});

	// file:src/parsing/udes.js
	BoxParser.createFullBoxCtor("udes", function(stream) {
		this.lang = stream.readCString();
		this.name = stream.readCString();
		this.description = stream.readCString();
		this.tags = stream.readCString();
	});

	// file:src/parsing/uncC.js
	BoxParser.createFullBoxCtor("uncC", function(stream) {
	    var i;
	    this.profile = stream.readUint32();
	    if (this.version == 1) ; else if (this.version == 0) {
	        this.component_count = stream.readUint32();
	        this.component_index = [];
	        this.component_bit_depth_minus_one = [];
	        this.component_format = [];
	        this.component_align_size = [];
	        for (i = 0; i < this.component_count; i++) {
	            this.component_index.push(stream.readUint16());
	            this.component_bit_depth_minus_one.push(stream.readUint8());
	            this.component_format.push(stream.readUint8());
	            this.component_align_size.push(stream.readUint8());
	        }
	        this.sampling_type = stream.readUint8();
	        this.interleave_type = stream.readUint8();
	        this.block_size = stream.readUint8();
	        var flags = stream.readUint8();
	        this.component_little_endian = (flags >> 7) & 0x1;
	        this.block_pad_lsb = (flags >> 6) & 0x1;
	        this.block_little_endian = (flags >> 5) & 0x1;
	        this.block_reversed = (flags >> 4) & 0x1;
	        this.pad_unknown = (flags >> 3) & 0x1;
	        this.pixel_size = stream.readUint32();
	        this.row_align_size = stream.readUint32();
	        this.tile_align_size = stream.readUint32();
	        this.num_tile_cols_minus_one = stream.readUint32();
	        this.num_tile_rows_minus_one = stream.readUint32();
	    }
	});

	// file:src/parsing/url.js
	BoxParser.createFullBoxCtor("url ", function(stream) {
		if (this.flags !== 0x000001) {
			this.location = stream.readCString();
		}
	});

	// file:src/parsing/urn.js
	BoxParser.createFullBoxCtor("urn ", function(stream) {
		this.name = stream.readCString();
		if (this.size - this.hdr_size - this.name.length - 1 > 0) {
			this.location = stream.readCString();
		}
	});

	// file:src/parsing/uuid/piff/piffLsm.js
	BoxParser.createUUIDBox("a5d40b30e81411ddba2f0800200c9a66", true, false, function(stream) {
	    this.LiveServerManifest = stream.readString(this.size - this.hdr_size)
	        .replace(/&/g, "&amp;")
	        .replace(/</g, "&lt;")
	        .replace(/>/g, "&gt;")
	        .replace(/"/g, "&quot;")
	        .replace(/'/g, "&#039;");
	});// file:src/parsing/uuid/piff/piffPssh.js
	BoxParser.createUUIDBox("d08a4f1810f34a82b6c832d8aba183d3", true, false, function(stream) {
		this.system_id = BoxParser.parseHex16(stream);
		var datasize = stream.readUint32();
		if (datasize > 0) {
			this.data = stream.readUint8Array(datasize);
		}
	});

	// file:src/parsing/uuid/piff/piffSenc.js
	BoxParser.createUUIDBox("a2394f525a9b4f14a2446c427c648df4", true, false /*, function(stream) {
		if (this.flags & 0x1) {
			this.AlgorithmID = stream.readUint24();
			this.IV_size = stream.readUint8();
			this.KID = BoxParser.parseHex16(stream);
		}
		var sample_count = stream.readUint32();
		this.samples = [];
		for (var i = 0; i < sample_count; i++) {
			var sample = {};
			sample.InitializationVector = this.readUint8Array(this.IV_size*8);
			if (this.flags & 0x2) {
				sample.subsamples = [];
				sample.NumberOfEntries = stream.readUint16();
				for (var j = 0; j < sample.NumberOfEntries; j++) {
					var subsample = {};
					subsample.BytesOfClearData = stream.readUint16();
					subsample.BytesOfProtectedData = stream.readUint32();
					sample.subsamples.push(subsample);
				}
			}
			this.samples.push(sample);
		}
	}*/);
	// file:src/parsing/uuid/piff/piffTenc.js
	BoxParser.createUUIDBox("8974dbce7be74c5184f97148f9882554", true, false, function(stream) {
		this.default_AlgorithmID = stream.readUint24();
		this.default_IV_size = stream.readUint8();
		this.default_KID = BoxParser.parseHex16(stream);
	});// file:src/parsing/uuid/piff/piffTfrf.js
	BoxParser.createUUIDBox("d4807ef2ca3946958e5426cb9e46a79f", true, false, function(stream) {
	    this.fragment_count = stream.readUint8();
	    this.entries = [];

	    for (var i = 0; i < this.fragment_count; i++) {
	        var entry = {};
	        var absolute_time = 0;
	        var absolute_duration = 0;

	        if (this.version === 1) {
	            absolute_time = stream.readUint64();
	            absolute_duration = stream.readUint64();
	        } else {
	            absolute_time = stream.readUint32();
	            absolute_duration = stream.readUint32();
	        }

	        entry.absolute_time = absolute_time;
	        entry.absolute_duration = absolute_duration;

	        this.entries.push(entry);
	    }
	});// file:src/parsing/uuid/piff/piffTfxd.js
	BoxParser.createUUIDBox("6d1d9b0542d544e680e2141daff757b2", true, false, function(stream) {
	    if (this.version === 1) {
	       this.absolute_time = stream.readUint64();
	       this.duration = stream.readUint64();
	    } else {
	       this.absolute_time = stream.readUint32();
	       this.duration = stream.readUint32();
	    }
	});// file:src/parsing/vmhd.js
	BoxParser.createFullBoxCtor("vmhd", function(stream) {
		this.graphicsmode = stream.readUint16();
		this.opcolor = stream.readUint16Array(3);
	});

	// file:src/parsing/vpcC.js
	BoxParser.createFullBoxCtor("vpcC", function (stream) {
		var tmp;
		if (this.version === 1) {
			this.profile = stream.readUint8();
			this.level = stream.readUint8();
			tmp = stream.readUint8();
			this.bitDepth = tmp >> 4;
			this.chromaSubsampling = (tmp >> 1) & 0x7;
			this.videoFullRangeFlag = tmp & 0x1;
			this.colourPrimaries = stream.readUint8();
			this.transferCharacteristics = stream.readUint8();
			this.matrixCoefficients = stream.readUint8();
			this.codecIntializationDataSize = stream.readUint16();
			this.codecIntializationData = stream.readUint8Array(this.codecIntializationDataSize);
		} else {
			this.profile = stream.readUint8();
			this.level = stream.readUint8();
			tmp = stream.readUint8();
			this.bitDepth = (tmp >> 4) & 0xF;
			this.colorSpace = tmp & 0xF;
			tmp = stream.readUint8();
			this.chromaSubsampling = (tmp >> 4) & 0xF;
			this.transferFunction = (tmp >> 1) & 0x7;
			this.videoFullRangeFlag = tmp & 0x1;
			this.codecIntializationDataSize = stream.readUint16();
			this.codecIntializationData = stream.readUint8Array(this.codecIntializationDataSize);
		}
	});// file:src/parsing/vttC.js
	BoxParser.createBoxCtor("vttC", function(stream) {
		this.text = stream.readString(this.size - this.hdr_size);
	});

	// file:src/parsing/vvcC.js
	BoxParser.createFullBoxCtor("vvcC", function (stream) {
	  var i, j;

	  // helper object to simplify extracting individual bits
	  var bitReader = {
	    held_bits: undefined,
	    num_held_bits: 0,

	    stream_read_1_bytes: function (strm) {
	      this.held_bits = strm.readUint8();
	      this.num_held_bits = 1 * 8;
	    },
	    stream_read_2_bytes: function (strm) {
	      this.held_bits = strm.readUint16();
	      this.num_held_bits = 2 * 8;
	    },

	    extract_bits: function (num_bits) {
	      var ret = (this.held_bits >> (this.num_held_bits - num_bits)) & ((1 << num_bits) - 1);
	      this.num_held_bits -= num_bits;
	      return ret;
	    }
	  };

	  // VvcDecoderConfigurationRecord
	  bitReader.stream_read_1_bytes(stream);
	  bitReader.extract_bits(5);  // reserved
	  this.lengthSizeMinusOne = bitReader.extract_bits(2);
	  this.ptl_present_flag = bitReader.extract_bits(1);

	  if (this.ptl_present_flag) {
	    bitReader.stream_read_2_bytes(stream);
	    this.ols_idx = bitReader.extract_bits(9);
	    this.num_sublayers = bitReader.extract_bits(3);
	    this.constant_frame_rate = bitReader.extract_bits(2);
	    this.chroma_format_idc = bitReader.extract_bits(2);

	    bitReader.stream_read_1_bytes(stream);
	    this.bit_depth_minus8 = bitReader.extract_bits(3);
	    bitReader.extract_bits(5);  // reserved

	    // VvcPTLRecord
	    {
	      bitReader.stream_read_2_bytes(stream);
	      bitReader.extract_bits(2);  // reserved
	      this.num_bytes_constraint_info = bitReader.extract_bits(6);
	      this.general_profile_idc = bitReader.extract_bits(7);
	      this.general_tier_flag = bitReader.extract_bits(1);

	      this.general_level_idc = stream.readUint8();

	      bitReader.stream_read_1_bytes(stream);
	      this.ptl_frame_only_constraint_flag = bitReader.extract_bits(1);
	      this.ptl_multilayer_enabled_flag = bitReader.extract_bits(1);

	      this.general_constraint_info = new Uint8Array(this.num_bytes_constraint_info);
	      if (this.num_bytes_constraint_info) {
	        for (i = 0; i < this.num_bytes_constraint_info - 1; i++) {
	          var cnstr1 = bitReader.extract_bits(6);
	          bitReader.stream_read_1_bytes(stream);
	          var cnstr2 = bitReader.extract_bits(2);

	          this.general_constraint_info[i] = ((cnstr1 << 2) | cnstr2);
	        }
	        this.general_constraint_info[this.num_bytes_constraint_info - 1] = bitReader.extract_bits(6);
	      } else {
	        //forbidden in spec!
	        bitReader.extract_bits(6);
	      }

	      if (this.num_sublayers > 1) {
	        bitReader.stream_read_1_bytes(stream);
	        this.ptl_sublayer_present_mask = 0;
	        for (j = this.num_sublayers - 2; j >= 0; --j) {
	          var val = bitReader.extract_bits(1);
	          this.ptl_sublayer_present_mask |= val << j;
	        }
	        for (j = this.num_sublayers; j <= 8 && this.num_sublayers > 1; ++j) {
	          bitReader.extract_bits(1);  // ptl_reserved_zero_bit
	        }

	        this.sublayer_level_idc = [];
	        for (j = this.num_sublayers - 2; j >= 0; --j) {
	          if (this.ptl_sublayer_present_mask & (1 << j)) {
	            this.sublayer_level_idc[j] = stream.readUint8();
	          }
	        }
	      }

	      this.ptl_num_sub_profiles = stream.readUint8();
	      this.general_sub_profile_idc = [];
	      if (this.ptl_num_sub_profiles) {
	        for (i = 0; i < this.ptl_num_sub_profiles; i++) {
	          this.general_sub_profile_idc.push(stream.readUint32());
	        }
	      }
	    }  // end VvcPTLRecord

	    this.max_picture_width = stream.readUint16();
	    this.max_picture_height = stream.readUint16();
	    this.avg_frame_rate = stream.readUint16();
	  }

	  var VVC_NALU_OPI = 12;
	  var VVC_NALU_DEC_PARAM = 13;

	  this.nalu_arrays = [];
	  var num_of_arrays = stream.readUint8();
	  for (i = 0; i < num_of_arrays; i++) {
	    var nalu_array = [];
	    this.nalu_arrays.push(nalu_array);

	    bitReader.stream_read_1_bytes(stream);
	    nalu_array.completeness = bitReader.extract_bits(1);
	    bitReader.extract_bits(2);  // reserved
	    nalu_array.nalu_type = bitReader.extract_bits(5);

	    var numNalus = 1;
	    if (nalu_array.nalu_type != VVC_NALU_DEC_PARAM && nalu_array.nalu_type != VVC_NALU_OPI) {
	      numNalus = stream.readUint16();
	    }

	    for (j = 0; j < numNalus; j++) {
	      var len = stream.readUint16();
	      nalu_array.push({
	        data: stream.readUint8Array(len),
	        length: len
	      });
	    }
	  }
	});
	// file:src/parsing/vvnC.js
	BoxParser.createFullBoxCtor("vvnC", function (stream) {
	  // VvcNALUConfigBox
	  var tmp = strm.readUint8();
	  this.lengthSizeMinusOne = (tmp & 0x3);
	});
	// file:src/box-codecs.js
	BoxParser.SampleEntry.prototype.isVideo = function() {
		return false;
	};

	BoxParser.SampleEntry.prototype.isAudio = function() {
		return false;
	};

	BoxParser.SampleEntry.prototype.isSubtitle = function() {
		return false;
	};

	BoxParser.SampleEntry.prototype.isMetadata = function() {
		return false;
	};

	BoxParser.SampleEntry.prototype.isHint = function() {
		return false;
	};

	BoxParser.SampleEntry.prototype.getCodec = function() {
		return this.type.replace('.','');
	};

	BoxParser.SampleEntry.prototype.getWidth = function() {
		return "";
	};

	BoxParser.SampleEntry.prototype.getHeight = function() {
		return "";
	};

	BoxParser.SampleEntry.prototype.getChannelCount = function() {
		return "";
	};

	BoxParser.SampleEntry.prototype.getSampleRate = function() {
		return "";
	};

	BoxParser.SampleEntry.prototype.getSampleSize = function() {
		return "";
	};

	BoxParser.VisualSampleEntry.prototype.isVideo = function() {
		return true;
	};

	BoxParser.VisualSampleEntry.prototype.getWidth = function() {
		return this.width;
	};

	BoxParser.VisualSampleEntry.prototype.getHeight = function() {
		return this.height;
	};

	BoxParser.AudioSampleEntry.prototype.isAudio = function() {
		return true;
	};

	BoxParser.AudioSampleEntry.prototype.getChannelCount = function() {
		return this.channel_count;
	};

	BoxParser.AudioSampleEntry.prototype.getSampleRate = function() {
		return this.samplerate;
	};

	BoxParser.AudioSampleEntry.prototype.getSampleSize = function() {
		return this.samplesize;
	};

	BoxParser.SubtitleSampleEntry.prototype.isSubtitle = function() {
		return true;
	};

	BoxParser.MetadataSampleEntry.prototype.isMetadata = function() {
		return true;
	};


	BoxParser.decimalToHex = function(d, padding) {
		var hex = Number(d).toString(16);
		padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;
		while (hex.length < padding) {
			hex = "0" + hex;
		}
		return hex;
	};

	BoxParser.avc1SampleEntry.prototype.getCodec =
	BoxParser.avc2SampleEntry.prototype.getCodec =
	BoxParser.avc3SampleEntry.prototype.getCodec =
	BoxParser.avc4SampleEntry.prototype.getCodec = function() {
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		if (this.avcC) {
			return baseCodec+"."+BoxParser.decimalToHex(this.avcC.AVCProfileIndication)+
							  ""+BoxParser.decimalToHex(this.avcC.profile_compatibility)+
							  ""+BoxParser.decimalToHex(this.avcC.AVCLevelIndication);
		} else {
			return baseCodec;
		}
	};

	BoxParser.hev1SampleEntry.prototype.getCodec =
	BoxParser.hvc1SampleEntry.prototype.getCodec = function() {
		var i;
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		if (this.hvcC) {
			baseCodec += '.';
			switch (this.hvcC.general_profile_space) {
				case 0:
					baseCodec += '';
					break;
				case 1:
					baseCodec += 'A';
					break;
				case 2:
					baseCodec += 'B';
					break;
				case 3:
					baseCodec += 'C';
					break;
			}
			baseCodec += this.hvcC.general_profile_idc;
			baseCodec += '.';
			var val = this.hvcC.general_profile_compatibility;
			var reversed = 0;
			for (i=0; i<32; i++) {
				reversed |= val & 1;
				if (i==31) break;
				reversed <<= 1;
				val >>=1;
			}
			baseCodec += BoxParser.decimalToHex(reversed, 0);
			baseCodec += '.';
			if (this.hvcC.general_tier_flag === 0) {
				baseCodec += 'L';
			} else {
				baseCodec += 'H';
			}
			baseCodec += this.hvcC.general_level_idc;
			var hasByte = false;
			var constraint_string = "";
			for (i = 5; i >= 0; i--) {
				if (this.hvcC.general_constraint_indicator[i] || hasByte) {
					constraint_string = "."+BoxParser.decimalToHex(this.hvcC.general_constraint_indicator[i], 0)+constraint_string;
					hasByte = true;
				}
			}
			baseCodec += constraint_string;
		}
		return baseCodec;
	};

	BoxParser.vvc1SampleEntry.prototype.getCodec =
	BoxParser.vvi1SampleEntry.prototype.getCodec = function () {
		var i;
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		if (this.vvcC) {
			baseCodec += '.' + this.vvcC.general_profile_idc;
			if (this.vvcC.general_tier_flag) {
				baseCodec += '.H';
			} else {
				baseCodec += '.L';
			}
			baseCodec += this.vvcC.general_level_idc;

			var constraint_string = "";
			if (this.vvcC.general_constraint_info) {
				var bytes = [];
				var byte = 0;
				byte |= this.vvcC.ptl_frame_only_constraint << 7;
				byte |= this.vvcC.ptl_multilayer_enabled << 6;
				var last_nonzero;
				for (i = 0; i < this.vvcC.general_constraint_info.length; ++i) {
					byte |= (this.vvcC.general_constraint_info[i] >> 2) & 0x3f;
					bytes.push(byte);
					if (byte) {
						last_nonzero = i;
					}

					byte = (this.vvcC.general_constraint_info[i] >> 2) & 0x03;
				}

				if (last_nonzero === undefined) {
					constraint_string = ".CA";
				}
				else {
					constraint_string = ".C";
					var base32_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
					var held_bits = 0;
					var num_held_bits = 0;
					for (i = 0; i <= last_nonzero; ++i) {
						held_bits = (held_bits << 8) | bytes[i];
						num_held_bits += 8;

						while (num_held_bits >= 5) {
							var val = (held_bits >> (num_held_bits - 5)) & 0x1f;
							constraint_string += base32_chars[val];

							num_held_bits -= 5;
							held_bits &= (1 << num_held_bits) - 1;
						}
					}
					if (num_held_bits) {
						held_bits <<= (5 - num_held_bits);  // right-pad with zeros to 5 bits (is this correct?)
						constraint_string += base32_chars[held_bits & 0x1f];
					}
				}
			}
			baseCodec += constraint_string;
		}
		return baseCodec;
	};

	BoxParser.mp4aSampleEntry.prototype.getCodec = function() {
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		if (this.esds && this.esds.esd) {
			var oti = this.esds.esd.getOTI();
			var dsi = this.esds.esd.getAudioConfig();
			return baseCodec+"."+BoxParser.decimalToHex(oti)+(dsi ? "."+dsi: "");
		} else {
			return baseCodec;
		}
	};

	BoxParser.stxtSampleEntry.prototype.getCodec = function() {
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		if(this.mime_format) {
			return baseCodec + "." + this.mime_format;
		} else {
			return baseCodec
		}
	};

	BoxParser.vp08SampleEntry.prototype.getCodec =
	BoxParser.vp09SampleEntry.prototype.getCodec = function() {
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		var level = this.vpcC.level;
		if (level == 0) {
			level = "00";
		}
		var bitDepth = this.vpcC.bitDepth;
		if (bitDepth == 8) {
			bitDepth = "08";
		}
		return baseCodec + ".0" + this.vpcC.profile + "." + level + "." + bitDepth;
	};

	BoxParser.av01SampleEntry.prototype.getCodec = function() {
		var baseCodec = BoxParser.SampleEntry.prototype.getCodec.call(this);
		var level = this.av1C.seq_level_idx_0;
		if (level < 10) {
			level = "0" + level;
		}
		var bitdepth;
		if (this.av1C.seq_profile === 2 && this.av1C.high_bitdepth === 1) {
			bitdepth = (this.av1C.twelve_bit === 1) ? "12" : "10";
		} else if ( this.av1C.seq_profile <= 2 ) {
			bitdepth = (this.av1C.high_bitdepth === 1) ? "10" : "08";
		}
		// TODO need to parse the SH to find color config
		return baseCodec+"."+this.av1C.seq_profile+"."+level+(this.av1C.seq_tier_0?"H":"M")+"."+bitdepth;//+"."+this.av1C.monochrome+"."+this.av1C.chroma_subsampling_x+""+this.av1C.chroma_subsampling_y+""+this.av1C.chroma_sample_position;
	};
	// file:src/box-write.js
	/* 
	 * Copyright (c) Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	BoxParser.Box.prototype.writeHeader = function(stream, msg) {
		this.size += 8;
		if (this.size > MAX_SIZE) {
			this.size += 8;
		}
		if (this.type === "uuid") {
			this.size += 16;
		}
		Log.debug("BoxWriter", "Writing box "+this.type+" of size: "+this.size+" at position "+stream.getPosition()+(msg || ""));
		if (this.size > MAX_SIZE) {
			stream.writeUint32(1);
		} else {
			this.sizePosition = stream.getPosition();
			stream.writeUint32(this.size);
		}
		stream.writeString(this.type, null, 4);
		if (this.type === "uuid") {
			stream.writeUint8Array(this.uuid);
		}
		if (this.size > MAX_SIZE) {
			stream.writeUint64(this.size);
		} 
	};

	BoxParser.FullBox.prototype.writeHeader = function(stream) {
		this.size += 4;
		BoxParser.Box.prototype.writeHeader.call(this, stream, " v="+this.version+" f="+this.flags);
		stream.writeUint8(this.version);
		stream.writeUint24(this.flags);
	};

	BoxParser.Box.prototype.write = function(stream) {
		if (this.type === "mdat") {
			/* TODO: fix this */
			if (this.data) {
				this.size = this.data.length;
				this.writeHeader(stream);
				stream.writeUint8Array(this.data);
			}
		} else {
			this.size = (this.data ? this.data.length : 0);
			this.writeHeader(stream);
			if (this.data) {
				stream.writeUint8Array(this.data);
			}
		}
	};

	BoxParser.ContainerBox.prototype.write = function(stream) {
		this.size = 0;
		this.writeHeader(stream);
		for (var i=0; i<this.boxes.length; i++) {
			if (this.boxes[i]) {
				this.boxes[i].write(stream);
				this.size += this.boxes[i].size;
			}
		}
		/* adjusting the size, now that all sub-boxes are known */
		Log.debug("BoxWriter", "Adjusting box "+this.type+" with new size "+this.size);
		stream.adjustUint32(this.sizePosition, this.size);
	};

	BoxParser.TrackReferenceTypeBox.prototype.write = function(stream) {
		this.size = this.track_ids.length*4;
		this.writeHeader(stream);
		stream.writeUint32Array(this.track_ids);
	};

	// file:src/writing/avcC.js
	BoxParser.avcCBox.prototype.write = function(stream) {
		var i;
		this.size = 7;
		for (i = 0; i < this.SPS.length; i++) {
			this.size += 2+this.SPS[i].length;
		}
		for (i = 0; i < this.PPS.length; i++) {
			this.size += 2+this.PPS[i].length;
		}
		if (this.ext) {
			this.size += this.ext.length;
		}
		this.writeHeader(stream);
		stream.writeUint8(this.configurationVersion);
		stream.writeUint8(this.AVCProfileIndication);
		stream.writeUint8(this.profile_compatibility);
		stream.writeUint8(this.AVCLevelIndication);
		stream.writeUint8(this.lengthSizeMinusOne + (63<<2));
		stream.writeUint8(this.SPS.length + (7<<5));
		for (i = 0; i < this.SPS.length; i++) {
			stream.writeUint16(this.SPS[i].length);
			stream.writeUint8Array(this.SPS[i].nalu);
		}
		stream.writeUint8(this.PPS.length);
		for (i = 0; i < this.PPS.length; i++) {
			stream.writeUint16(this.PPS[i].length);
			stream.writeUint8Array(this.PPS[i].nalu);
		}
		if (this.ext) {
			stream.writeUint8Array(this.ext);
		}
	};

	// file:src/writing/co64.js
	BoxParser.co64Box.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 4+8*this.chunk_offsets.length;
		this.writeHeader(stream);
		stream.writeUint32(this.chunk_offsets.length);
		for(i=0; i<this.chunk_offsets.length; i++) {
			stream.writeUint64(this.chunk_offsets[i]);
		}
	};

	// file:src/writing/cslg.js
	BoxParser.cslgBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4*5;
		this.writeHeader(stream);
		stream.writeInt32(this.compositionToDTSShift);
		stream.writeInt32(this.leastDecodeToDisplayDelta);
		stream.writeInt32(this.greatestDecodeToDisplayDelta);
		stream.writeInt32(this.compositionStartTime);
		stream.writeInt32(this.compositionEndTime);
	};

	// file:src/writing/ctts.js
	BoxParser.cttsBox.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 4+8*this.sample_counts.length;
		this.writeHeader(stream);
		stream.writeUint32(this.sample_counts.length);
		for(i=0; i<this.sample_counts.length; i++) {
			stream.writeUint32(this.sample_counts[i]);
			if (this.version === 1) {
				stream.writeInt32(this.sample_offsets[i]); /* signed */
			} else {			
				stream.writeUint32(this.sample_offsets[i]); /* unsigned */
			}
		}
	};

	// file:src/writing/dref.js
	BoxParser.drefBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4; //
		this.writeHeader(stream);
		stream.writeUint32(this.entries.length);
		for (var i = 0; i < this.entries.length; i++) {
			this.entries[i].write(stream);
			this.size += this.entries[i].size;
		}	
		/* adjusting the size, now that all sub-boxes are known */
		Log.debug("BoxWriter", "Adjusting box "+this.type+" with new size "+this.size);
		stream.adjustUint32(this.sizePosition, this.size);
	};

	// file:src/writing/elng.js
	BoxParser.elngBox.prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = this.extended_language.length;
		this.writeHeader(stream);
		stream.writeString(this.extended_language);
	};

	// file:src/writing/elst.js
	BoxParser.elstBox.prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = 4+12*this.entries.length;
		this.writeHeader(stream);
		stream.writeUint32(this.entries.length);
		for (var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i];
			stream.writeUint32(entry.segment_duration);
			stream.writeInt32(entry.media_time);
			stream.writeInt16(entry.media_rate_integer);
			stream.writeInt16(entry.media_rate_fraction);
		}
	};

	// file:src/writing/emsg.js
	BoxParser.emsgBox.prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = 4*4+this.message_data.length+(this.scheme_id_uri.length+1)+(this.value.length+1);
		this.writeHeader(stream);
		stream.writeCString(this.scheme_id_uri);
		stream.writeCString(this.value);
		stream.writeUint32(this.timescale);
		stream.writeUint32(this.presentation_time_delta);
		stream.writeUint32(this.event_duration);
		stream.writeUint32(this.id);
		stream.writeUint8Array(this.message_data);
	};

	// file:src/writing/ftyp.js
	BoxParser.ftypBox.prototype.write = function(stream) {
		this.size = 8+4*this.compatible_brands.length;
		this.writeHeader(stream);
		stream.writeString(this.major_brand, null, 4);
		stream.writeUint32(this.minor_version);
		for (var i = 0; i < this.compatible_brands.length; i++) {
			stream.writeString(this.compatible_brands[i], null, 4);
		}
	};

	// file:src/writing/hdlr.js
	BoxParser.hdlrBox.prototype.write = function(stream) {
		this.size = 5*4+this.name.length+1;
		this.version = 0;
		this.flags = 0;
		this.writeHeader(stream);
		stream.writeUint32(0);
		stream.writeString(this.handler, null, 4);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeCString(this.name);
	};

	// file:src/writing/hvcC.js
	BoxParser.hvcCBox.prototype.write = function(stream) {
	    var i,j;
	    this.size = 23;

	    for (i = 0; i < this.nalu_arrays.length; i++) {
	      this.size += 3;
	      for (j = 0; j < this.nalu_arrays[i].length; j++) {
	        this.size += 2 + this.nalu_arrays[i][j].data.length;
	      }
	    }

	    this.writeHeader(stream);

	    stream.writeUint8(this.configurationVersion);
	    stream.writeUint8((this.general_profile_space << 6) +
	                      (this.general_tier_flag << 5) +
	                      this.general_profile_idc);
	    stream.writeUint32(this.general_profile_compatibility);
	    stream.writeUint8Array(this.general_constraint_indicator);
	    stream.writeUint8(this.general_level_idc);
	    stream.writeUint16(this.min_spatial_segmentation_idc + (15<<24));
	    stream.writeUint8(this.parallelismType + (63<<2));
	    stream.writeUint8(this.chroma_format_idc + (63<<2));
	    stream.writeUint8(this.bit_depth_luma_minus8 + (31<<3));
	    stream.writeUint8(this.bit_depth_chroma_minus8 + (31<<3));
	    stream.writeUint16(this.avgFrameRate);
	    stream.writeUint8((this.constantFrameRate<<6) +
	                   (this.numTemporalLayers<<3) +
	                   (this.temporalIdNested<<2) +
	                   this.lengthSizeMinusOne);
	    stream.writeUint8(this.nalu_arrays.length);
	    for (i = 0; i < this.nalu_arrays.length; i++) {
	      // bit(1) array_completeness + bit(1) reserved = 0 + bit(6) nal_unit_type
	      stream.writeUint8((this.nalu_arrays[i].completeness<<7) +
	                         this.nalu_arrays[i].nalu_type);
	      stream.writeUint16(this.nalu_arrays[i].length);
	      for (j = 0; j < this.nalu_arrays[i].length; j++) {
	        stream.writeUint16(this.nalu_arrays[i][j].data.length);
	        stream.writeUint8Array(this.nalu_arrays[i][j].data);
	      }
	    }
	};
	// file:src/writing/kind.js
	BoxParser.kindBox.prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = (this.schemeURI.length+1)+(this.value.length+1);
		this.writeHeader(stream);
		stream.writeCString(this.schemeURI);
		stream.writeCString(this.value);
	};

	// file:src/writing/mdhd.js
	BoxParser.mdhdBox.prototype.write = function(stream) {
		this.size = 4*4+2*2;
		this.flags = 0;
		this.version = 0;
		this.writeHeader(stream);
		stream.writeUint32(this.creation_time);
		stream.writeUint32(this.modification_time);
		stream.writeUint32(this.timescale);
		stream.writeUint32(this.duration);
		stream.writeUint16(this.language);
		stream.writeUint16(0);
	};

	// file:src/writing/mehd.js
	BoxParser.mehdBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4;
		this.writeHeader(stream);
		stream.writeUint32(this.fragment_duration);
	};

	// file:src/writing/mfhd.js
	BoxParser.mfhdBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4;
		this.writeHeader(stream);
		stream.writeUint32(this.sequence_number);
	};

	// file:src/writing/mvhd.js
	BoxParser.mvhdBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 23*4+2*2;
		this.writeHeader(stream);
		stream.writeUint32(this.creation_time);
		stream.writeUint32(this.modification_time);
		stream.writeUint32(this.timescale);
		stream.writeUint32(this.duration);
		stream.writeUint32(this.rate);
		stream.writeUint16(this.volume<<8);
		stream.writeUint16(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32Array(this.matrix);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(this.next_track_id);
	};

	// file:src/writing/sampleentry.js
	BoxParser.SampleEntry.prototype.writeHeader = function(stream) {
		this.size = 8;
		BoxParser.Box.prototype.writeHeader.call(this, stream);
		stream.writeUint8(0);
		stream.writeUint8(0);
		stream.writeUint8(0);
		stream.writeUint8(0);
		stream.writeUint8(0);
		stream.writeUint8(0);
		stream.writeUint16(this.data_reference_index);
	};

	BoxParser.SampleEntry.prototype.writeFooter = function(stream) {
		for (var i=0; i<this.boxes.length; i++) {
			this.boxes[i].write(stream);
			this.size += this.boxes[i].size;
		}
		Log.debug("BoxWriter", "Adjusting box "+this.type+" with new size "+this.size);
		stream.adjustUint32(this.sizePosition, this.size);	
	};

	BoxParser.SampleEntry.prototype.write = function(stream) {
		this.writeHeader(stream);
		stream.writeUint8Array(this.data);
		this.size += this.data.length;
		Log.debug("BoxWriter", "Adjusting box "+this.type+" with new size "+this.size);
		stream.adjustUint32(this.sizePosition, this.size);	
	};

	BoxParser.VisualSampleEntry.prototype.write = function(stream) {
		this.writeHeader(stream);
		this.size += 2*7+6*4+32;
		stream.writeUint16(0); 
		stream.writeUint16(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint16(this.width);
		stream.writeUint16(this.height);
		stream.writeUint32(this.horizresolution);
		stream.writeUint32(this.vertresolution);
		stream.writeUint32(0);
		stream.writeUint16(this.frame_count);
		stream.writeUint8(Math.min(31, this.compressorname.length));
		stream.writeString(this.compressorname, null, 31);
		stream.writeUint16(this.depth);
		stream.writeInt16(-1);
		this.writeFooter(stream);
	};

	BoxParser.AudioSampleEntry.prototype.write = function(stream) {
		this.writeHeader(stream);
		this.size += 2*4+3*4;
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeUint16(this.channel_count);
		stream.writeUint16(this.samplesize);
		stream.writeUint16(0);
		stream.writeUint16(0);
		stream.writeUint32(this.samplerate<<16);
		this.writeFooter(stream);
	};

	BoxParser.stppSampleEntry.prototype.write = function(stream) {
		this.writeHeader(stream);
		this.size += this.namespace.length+1+
					 this.schema_location.length+1+
					 this.auxiliary_mime_types.length+1;
		stream.writeCString(this.namespace);
		stream.writeCString(this.schema_location);
		stream.writeCString(this.auxiliary_mime_types);
		this.writeFooter(stream);
	};

	// file:src/writing/samplegroups/samplegroup.js
	BoxParser.SampleGroupEntry.prototype.write = function(stream) {
		stream.writeUint8Array(this.data);
	};

	// file:src/writing/sbgp.js
	BoxParser.sbgpBox.prototype.write = function(stream) {
		this.version = 1;	
		this.flags = 0;
		this.size = 12+8*this.entries.length;
		this.writeHeader(stream);
		stream.writeString(this.grouping_type, null, 4);
		stream.writeUint32(this.grouping_type_parameter);
		stream.writeUint32(this.entries.length);
		for (var i = 0; i < this.entries.length; i++) {
			var entry = this.entries[i];
			stream.writeInt32(entry.sample_count);
			stream.writeInt32(entry.group_description_index);
		}
	};

	// file:src/writing/sgpd.js
	BoxParser.sgpdBox.prototype.write = function(stream) {
		var i;
		var entry;
		// leave version as read
		// this.version;
		this.flags = 0;
		this.size = 12;
		for (i = 0; i < this.entries.length; i++) {
			entry = this.entries[i];
			if (this.version === 1) {
				if (this.default_length === 0) {
					this.size += 4;
				}
				this.size += entry.data.length;
			}
		}
		this.writeHeader(stream);
		stream.writeString(this.grouping_type, null, 4);
		if (this.version === 1) {
			stream.writeUint32(this.default_length);
		}
		if (this.version >= 2) {
			stream.writeUint32(this.default_sample_description_index);
		}
		stream.writeUint32(this.entries.length);
		for (i = 0; i < this.entries.length; i++) {
			entry = this.entries[i];
			if (this.version === 1) {
				if (this.default_length === 0) {
					stream.writeUint32(entry.description_length);
				}
			}
			entry.write(stream);
		}
	};


	// file:src/writing/sidx.js
	BoxParser.sidxBox.prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = 4*4+2+2+12*this.references.length;
		this.writeHeader(stream);
		stream.writeUint32(this.reference_ID);
		stream.writeUint32(this.timescale);
		stream.writeUint32(this.earliest_presentation_time);
		stream.writeUint32(this.first_offset);
		stream.writeUint16(0);
		stream.writeUint16(this.references.length);
		for (var i = 0; i < this.references.length; i++) {
			var ref = this.references[i];
			stream.writeUint32(ref.reference_type << 31 | ref.referenced_size);
			stream.writeUint32(ref.subsegment_duration);
			stream.writeUint32(ref.starts_with_SAP << 31 | ref.SAP_type << 28 | ref.SAP_delta_time);
		}
	};

	// file:src/writing/smhd.js
	BoxParser.smhdBox.prototype.write = function(stream) {
	  this.version = 0;
	  this.flags = 1;
	  this.size = 4;
	  this.writeHeader(stream);
	  stream.writeUint16(this.balance);
	  stream.writeUint16(0);
	};
	// file:src/writing/stco.js
	BoxParser.stcoBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4+4*this.chunk_offsets.length;
		this.writeHeader(stream);
		stream.writeUint32(this.chunk_offsets.length);
		stream.writeUint32Array(this.chunk_offsets);
	};

	// file:src/writing/stsc.js
	BoxParser.stscBox.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 4+12*this.first_chunk.length;
		this.writeHeader(stream);
		stream.writeUint32(this.first_chunk.length);
		for(i=0; i<this.first_chunk.length; i++) {
			stream.writeUint32(this.first_chunk[i]);
			stream.writeUint32(this.samples_per_chunk[i]);
			stream.writeUint32(this.sample_description_index[i]);
		}
	};

	// file:src/writing/stsd.js
	BoxParser.stsdBox.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 0;
		this.writeHeader(stream);
		stream.writeUint32(this.entries.length);
		this.size += 4;
		for (i = 0; i < this.entries.length; i++) {
			this.entries[i].write(stream);
			this.size += this.entries[i].size;
		}
		/* adjusting the size, now that all sub-boxes are known */
		Log.debug("BoxWriter", "Adjusting box "+this.type+" with new size "+this.size);
		stream.adjustUint32(this.sizePosition, this.size);
	};

	// file:src/writing/stsh.js
	BoxParser.stshBox.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 4+8*this.shadowed_sample_numbers.length;
		this.writeHeader(stream);
		stream.writeUint32(this.shadowed_sample_numbers.length);
		for(i=0; i<this.shadowed_sample_numbers.length; i++) {
			stream.writeUint32(this.shadowed_sample_numbers[i]);
			stream.writeUint32(this.sync_sample_numbers[i]);
		}
	};

	// file:src/writing/stss.js
	BoxParser.stssBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4+4*this.sample_numbers.length;
		this.writeHeader(stream);
		stream.writeUint32(this.sample_numbers.length);
		stream.writeUint32Array(this.sample_numbers);
	};

	// file:src/writing/stsz.js
	BoxParser.stszBox.prototype.write = function(stream) {
		var i;
		var constant = true;
		this.version = 0;
		this.flags = 0;
		if (this.sample_sizes.length > 0) {
			i = 0;
			while (i+1 < this.sample_sizes.length) {
				if (this.sample_sizes[i+1] !==  this.sample_sizes[0]) {
					constant = false;
					break;
				} else {
					i++;
				}
			}
		} else {
			constant = false;
		}
		this.size = 8;
		if (!constant) {
			this.size += 4*this.sample_sizes.length;
		}
		this.writeHeader(stream);
		if (!constant) {
			stream.writeUint32(0);
		} else {
			stream.writeUint32(this.sample_sizes[0]);
		}
		stream.writeUint32(this.sample_sizes.length);
		if (!constant) {
			stream.writeUint32Array(this.sample_sizes);
		}	
	};

	// file:src/writing/stts.js
	BoxParser.sttsBox.prototype.write = function(stream) {
		var i;
		this.version = 0;
		this.flags = 0;
		this.size = 4+8*this.sample_counts.length;
		this.writeHeader(stream);
		stream.writeUint32(this.sample_counts.length);
		for(i=0; i<this.sample_counts.length; i++) {
			stream.writeUint32(this.sample_counts[i]);
			stream.writeUint32(this.sample_deltas[i]);
		}
	};

	// file:src/writing/tfdt.js
	BoxParser.tfdtBox.prototype.write = function(stream) {
		var UINT32_MAX = Math.pow(2, 32) - 1;
		// use version 1 if baseMediaDecodeTime does not fit 32 bits
		this.version = this.baseMediaDecodeTime > UINT32_MAX ? 1 : 0;
		this.flags = 0;
		this.size = 4;
		if (this.version === 1) {
			this.size += 4;
		}
		this.writeHeader(stream);
		if (this.version === 1) {
			stream.writeUint64(this.baseMediaDecodeTime);
		} else {
			stream.writeUint32(this.baseMediaDecodeTime);
		}
	};

	// file:src/writing/tfhd.js
	BoxParser.tfhdBox.prototype.write = function(stream) {
		this.version = 0;
		this.size = 4;
		if (this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET) {
			this.size += 8;
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC) {
			this.size += 4;
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR) {
			this.size += 4;
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE) {
			this.size += 4;
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS) {
			this.size += 4;
		}
		this.writeHeader(stream);
		stream.writeUint32(this.track_id);
		if (this.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET) {
			stream.writeUint64(this.base_data_offset);
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC) {
			stream.writeUint32(this.default_sample_description_index);
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR) {
			stream.writeUint32(this.default_sample_duration);
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE) {
			stream.writeUint32(this.default_sample_size);
		}
		if (this.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS) {
			stream.writeUint32(this.default_sample_flags);
		}
	};

	// file:src/writing/tkhd.js
	BoxParser.tkhdBox.prototype.write = function(stream) {
		this.version = 0;
		//this.flags = 0;
		this.size = 4*18+2*4;
		this.writeHeader(stream);
		stream.writeUint32(this.creation_time);
		stream.writeUint32(this.modification_time);
		stream.writeUint32(this.track_id);
		stream.writeUint32(0);
		stream.writeUint32(this.duration);
		stream.writeUint32(0);
		stream.writeUint32(0);
		stream.writeInt16(this.layer);
		stream.writeInt16(this.alternate_group);
		stream.writeInt16(this.volume<<8);
		stream.writeUint16(0);
		stream.writeInt32Array(this.matrix);
		stream.writeUint32(this.width);
		stream.writeUint32(this.height);
	};

	// file:src/writing/trex.js
	BoxParser.trexBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 0;
		this.size = 4*5;
		this.writeHeader(stream);
		stream.writeUint32(this.track_id);
		stream.writeUint32(this.default_sample_description_index);
		stream.writeUint32(this.default_sample_duration);
		stream.writeUint32(this.default_sample_size);
		stream.writeUint32(this.default_sample_flags);
	};

	// file:src/writing/trun.js
	BoxParser.trunBox.prototype.write = function(stream) {
		this.version = 0;
		this.size = 4;
		if (this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET) {
			this.size += 4;
		}
		if (this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG) {
			this.size += 4;
		}
		if (this.flags & BoxParser.TRUN_FLAGS_DURATION) {
			this.size += 4*this.sample_duration.length;
		}
		if (this.flags & BoxParser.TRUN_FLAGS_SIZE) {
			this.size += 4*this.sample_size.length;
		}
		if (this.flags & BoxParser.TRUN_FLAGS_FLAGS) {
			this.size += 4*this.sample_flags.length;
		}
		if (this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET) {
			this.size += 4*this.sample_composition_time_offset.length;
		}
		this.writeHeader(stream);
		stream.writeUint32(this.sample_count);
		if (this.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET) {
			this.data_offset_position = stream.getPosition();
			stream.writeInt32(this.data_offset); //signed
		}
		if (this.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG) {
			stream.writeUint32(this.first_sample_flags);
		}
		for (var i = 0; i < this.sample_count; i++) {
			if (this.flags & BoxParser.TRUN_FLAGS_DURATION) {
				stream.writeUint32(this.sample_duration[i]);
			}
			if (this.flags & BoxParser.TRUN_FLAGS_SIZE) {
				stream.writeUint32(this.sample_size[i]);
			}
			if (this.flags & BoxParser.TRUN_FLAGS_FLAGS) {
				stream.writeUint32(this.sample_flags[i]);
			}
			if (this.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET) {
				if (this.version === 0) {
					stream.writeUint32(this.sample_composition_time_offset[i]);
				} else {
					stream.writeInt32(this.sample_composition_time_offset[i]); //signed
				}
			}
		}		
	};

	// file:src/writing/url.js
	BoxParser["url Box"].prototype.write = function(stream) {
		this.version = 0;	
		if (this.location) {
			this.flags = 0;
			this.size = this.location.length+1;
		} else {
			this.flags = 0x000001;
			this.size = 0;
		}
		this.writeHeader(stream);
		if (this.location) {
			stream.writeCString(this.location);
		}
	};

	// file:src/writing/urn.js
	BoxParser["urn Box"].prototype.write = function(stream) {
		this.version = 0;	
		this.flags = 0;
		this.size = this.name.length+1+(this.location ? this.location.length+1 : 0);
		this.writeHeader(stream);
		stream.writeCString(this.name);
		if (this.location) {
			stream.writeCString(this.location);
		}
	};

	// file:src/writing/vmhd.js
	BoxParser.vmhdBox.prototype.write = function(stream) {
		this.version = 0;
		this.flags = 1;
		this.size = 8;
		this.writeHeader(stream);
		stream.writeUint16(this.graphicsmode);
		stream.writeUint16Array(this.opcolor);
	};

	// file:src/writing/vpcC.js
	BoxParser.vpcCBox.prototype.write = function (stream) {
		this.version = 1;
	  const bodySize = 8 + this.codecIntializationDataSize;
	  this.size = bodySize;

	  this.writeHeader(stream); // write full box header: size + 'vpcC' + version + flags

	  // version 1 writing (strict alignment spec)
	  stream.writeUint8(this.profile); // profile (1 byte)
	  stream.writeUint8(this.level);   // level (1 byte)

	  // bitDepth (4 bits), chromaSubsampling (3 bits), videoFullRangeFlag (1 bit)
	  let byte4 = (this.bitDepth << 4) |
	              ((this.chromaSubsampling & 0x7) << 1) |
	              (this.videoFullRangeFlag & 0x1);
	  stream.writeUint8(byte4);

	  stream.writeUint8(this.colourPrimaries);
	  stream.writeUint8(this.transferCharacteristics);
	  stream.writeUint8(this.matrixCoefficients);

	  // codecInitializationDataSize + codecInitializationData
	  stream.writeUint16(this.codecIntializationDataSize);
	  if (this.codecIntializationDataSize > 0) {
	    stream.writeUint8Array(this.codecIntializationData);
	  }
	};
	// file:src/box-unpack.js
	/* 
	 * Copyright (c) Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	BoxParser.cttsBox.prototype.unpack = function(samples) {
		var i, j, k;
		k = 0;
		for (i = 0; i < this.sample_counts.length; i++) {
			for (j = 0; j < this.sample_counts[i]; j++) {
				samples[k].pts = samples[k].dts + this.sample_offsets[i];
				k++;
			}
		}
	};

	BoxParser.sttsBox.prototype.unpack = function(samples) {
		var i, j, k;
		k = 0;
		for (i = 0; i < this.sample_counts.length; i++) {
			for (j = 0; j < this.sample_counts[i]; j++) {
				if (k === 0) {
					samples[k].dts = 0;
				} else {
					samples[k].dts = samples[k-1].dts + this.sample_deltas[i];
				}
				k++;
			}
		}
	};

	BoxParser.stcoBox.prototype.unpack = function(samples) {
		var i;
		for (i = 0; i < this.chunk_offsets.length; i++) {
			samples[i].offset = this.chunk_offsets[i];
		}
	};

	BoxParser.stscBox.prototype.unpack = function(samples) {
		var i, j, k, l, m;
		l = 0;
		m = 0;
		for (i = 0; i < this.first_chunk.length; i++) {
			for (j = 0; j < (i+1 < this.first_chunk.length ? this.first_chunk[i+1] : Infinity); j++) {
				m++;
				for (k = 0; k < this.samples_per_chunk[i]; k++) {
					if (samples[l]) {
						samples[l].description_index = this.sample_description_index[i];
						samples[l].chunk_index = m;
					} else {
						return;
					}
					l++;
				}			
			}
		}
	};

	BoxParser.stszBox.prototype.unpack = function(samples) {
		var i;
		for (i = 0; i < this.sample_sizes.length; i++) {
			samples[i].size = this.sample_sizes[i];
		}
	};
	// file:src/box-diff.js

	BoxParser.DIFF_BOXES_PROP_NAMES = [ "boxes", "entries", "references", "subsamples",
						 	 "items", "item_infos", "extents", "associations",
						 	 "subsegments", "ranges", "seekLists", "seekPoints",
						 	 "esd", "levels"];

	BoxParser.DIFF_PRIMITIVE_ARRAY_PROP_NAMES = [ "compatible_brands", "matrix", "opcolor", "sample_counts", "sample_counts", "sample_deltas",
	"first_chunk", "samples_per_chunk", "sample_sizes", "chunk_offsets", "sample_offsets", "sample_description_index", "sample_duration" ];

	BoxParser.boxEqualFields = function(box_a, box_b) {
		if (box_a && !box_b) return false;
		var prop;
		for (prop in box_a) {
			if (BoxParser.DIFF_BOXES_PROP_NAMES.indexOf(prop) > -1) {
				continue;
			// } else if (excluded_fields && excluded_fields.indexOf(prop) > -1) {
			// 	continue;
			} else if (box_a[prop] instanceof BoxParser.Box || box_b[prop] instanceof BoxParser.Box) {
				continue;
			} else if (typeof box_a[prop] === "undefined" || typeof box_b[prop] === "undefined") {
				continue;
			} else if (typeof box_a[prop] === "function" || typeof box_b[prop] === "function") {
				continue;
			} else if (
				(box_a.subBoxNames && box_a.subBoxNames.indexOf(prop.slice(0,4)) > -1) ||
				(box_b.subBoxNames && box_b.subBoxNames.indexOf(prop.slice(0,4)) > -1))  {
				continue;
			} else {
				if (prop === "data" || prop === "start" || prop === "size" || prop === "creation_time" || prop === "modification_time") {
					continue;
				} else if (BoxParser.DIFF_PRIMITIVE_ARRAY_PROP_NAMES.indexOf(prop) > -1) {
					continue;
				} else {
					if (box_a[prop] !== box_b[prop]) {
						return false;
					}
				}
			}
		}
		return true;
	};

	BoxParser.boxEqual = function(box_a, box_b) {
		if (!BoxParser.boxEqualFields(box_a, box_b)) {
			return false;
		}
		for (var j = 0; j < BoxParser.DIFF_BOXES_PROP_NAMES.length; j++) {
			var name = BoxParser.DIFF_BOXES_PROP_NAMES[j];
			if (box_a[name] && box_b[name]) {
				if (!BoxParser.boxEqual(box_a[name], box_b[name])) {
					return false;
				}
			}
		}
		return true;
	};// file:src/text-mp4.js

	var XMLSubtitlein4Parser = function() {	
	};

	XMLSubtitlein4Parser.prototype.parseSample = function(sample) {
		var res = {};	
		var i;
		res.resources = [];
		var stream = new MP4BoxStream(sample.data.buffer);
		if (!sample.subsamples || sample.subsamples.length === 0) {
			res.documentString = stream.readString(sample.data.length);
		} else {
			res.documentString = stream.readString(sample.subsamples[0].size);
			if (sample.subsamples.length > 1) {
				for (i = 1; i < sample.subsamples.length; i++) {
					res.resources[i] = stream.readUint8Array(sample.subsamples[i].size);
				}
			}
		}
		if (typeof (DOMParser) !== "undefined") {
			res.document = (new DOMParser()).parseFromString(res.documentString, "application/xml");
		}
		return res;
	};

	var Textin4Parser = function() {	
	};

	Textin4Parser.prototype.parseSample = function(sample) {
		var textString;
		var stream = new MP4BoxStream(sample.data.buffer);
		textString = stream.readString(sample.data.length);
		return textString;
	};

	Textin4Parser.prototype.parseConfig = function(data) {
		var textString;
		var stream = new MP4BoxStream(data.buffer);
		stream.readUint32(); // version & flags
		textString = stream.readCString();
		return textString;
	};

	{
		exports$1.XMLSubtitlein4Parser = XMLSubtitlein4Parser;
		exports$1.Textin4Parser = Textin4Parser;
	}
	// file:src/isofile.js
	/*
	 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	var ISOFile = function (stream) {
		/* MutiBufferStream object used to parse boxes */
		this.stream = stream || new MultiBufferStream();
		/* Array of all boxes (in order) found in the file */
		this.boxes = [];
		/* Array of all mdats */
		this.mdats = [];
		/* Array of all moofs */
		this.moofs = [];
		/* Boolean indicating if the file is compatible with progressive parsing (moov first) */
		this.isProgressive = false;
		/* Boolean used to fire moov start event only once */
		this.moovStartFound = false;
		/* Callback called when the moov parsing starts */
		this.onMoovStart = null;
		/* Boolean keeping track of the call to onMoovStart, to avoid double calls */
		this.moovStartSent = false;
		/* Callback called when the moov is entirely parsed */
		this.onReady = null;
		/* Boolean keeping track of the call to onReady, to avoid double calls */
		this.readySent = false;
		/* Callback to call when segments are ready */
		this.onSegment = null;
		/* Callback to call when samples are ready */
		this.onSamples = null;
		/* Callback to call when there is an error in the parsing or processing of samples */
		this.onError = null;
		/* Boolean indicating if the moov box run-length encoded tables of sample information have been processed */
		this.sampleListBuilt = false;
		/* Array of Track objects for which fragmentation of samples is requested */
		this.fragmentedTracks = [];
		/* Array of Track objects for which extraction of samples is requested */
		this.extractedTracks = [];
		/* Boolean indicating that fragmention is ready */
		this.isFragmentationInitialized = false;
		/* Boolean indicating that fragmented has started */
		this.sampleProcessingStarted = false;
		/* Number of the next 'moof' to generate when fragmenting */
		this.nextMoofNumber = 0;
		/* Boolean indicating if the initial list of items has been produced */
		this.itemListBuilt = false;
		/* Callback called when the sidx box is entirely parsed */
		this.onSidx = null;
		/* Boolean keeping track of the call to onSidx, to avoid double calls */
		this.sidxSent = false;
	};

	ISOFile.prototype.setSegmentOptions = function(id, user, options) {
		var trak = this.getTrackById(id);
		if (trak) {
			var fragTrack = {};
			this.fragmentedTracks.push(fragTrack);
			fragTrack.id = id;
			fragTrack.user = user;
			fragTrack.trak = trak;
			trak.nextSample = 0;
			fragTrack.segmentStream = null;
			fragTrack.nb_samples = 1000;
			fragTrack.rapAlignement = true;
			if (options) {
				if (options.nbSamples) fragTrack.nb_samples = options.nbSamples;
				if (options.rapAlignement) fragTrack.rapAlignement = options.rapAlignement;
			}
		}
	};

	ISOFile.prototype.unsetSegmentOptions = function(id) {
		var index = -1;
		for (var i = 0; i < this.fragmentedTracks.length; i++) {
			var fragTrack = this.fragmentedTracks[i];
			if (fragTrack.id == id) {
				index = i;
			}
		}
		if (index > -1) {
			this.fragmentedTracks.splice(index, 1);
		}
	};

	ISOFile.prototype.setExtractionOptions = function(id, user, options) {
		var trak = this.getTrackById(id);
		if (trak) {
			var extractTrack = {};
			this.extractedTracks.push(extractTrack);
			extractTrack.id = id;
			extractTrack.user = user;
			extractTrack.trak = trak;
			trak.nextSample = 0;
			extractTrack.nb_samples = 1000;
			extractTrack.samples = [];
			if (options) {
				if (options.nbSamples) extractTrack.nb_samples = options.nbSamples;
			}
		}
	};

	ISOFile.prototype.unsetExtractionOptions = function(id) {
		var index = -1;
		for (var i = 0; i < this.extractedTracks.length; i++) {
			var extractTrack = this.extractedTracks[i];
			if (extractTrack.id == id) {
				index = i;
			}
		}
		if (index > -1) {
			this.extractedTracks.splice(index, 1);
		}
	};

	ISOFile.prototype.parse = function() {
		var ret;
		var box;
		var parseBoxHeadersOnly = false;

		if (this.restoreParsePosition)	{
			if (!this.restoreParsePosition()) {
				return;
			}
		}

		while (true) {

			if (this.hasIncompleteMdat && this.hasIncompleteMdat()) {
				if (this.processIncompleteMdat()) {
					continue;
				} else {
					return;
				}
			} else {
				if (this.saveParsePosition)	{
					this.saveParsePosition();
				}
				ret = BoxParser.parseOneBox(this.stream, parseBoxHeadersOnly);
				if (ret.code === BoxParser.ERR_NOT_ENOUGH_DATA) {
					if (this.processIncompleteBox) {
						if (this.processIncompleteBox(ret)) {
							continue;
						} else {
							return;
						}
					} else {
						return;
					}
				} else {
					var box_type;
					/* the box is entirely parsed */
					box = ret.box;
					box_type = (box.type !== "uuid" ? box.type : box.uuid);
					/* store the box in the 'boxes' array to preserve box order (for file rewrite if needed)  */
					this.boxes.push(box);
					/* but also store box in a property for more direct access */
					switch (box_type) {
						case "mdat":
							this.mdats.push(box);
							break;
						case "moof":
							this.moofs.push(box);
							break;
						case "moov":
							this.moovStartFound = true;
							if (this.mdats.length === 0) {
								this.isProgressive = true;
							}
							/* no break */
							/* falls through */
						default:
							if (this[box_type] !== undefined) {
								Log.warn("ISOFile", "Duplicate Box of type: "+box_type+", overriding previous occurrence");
							}
							this[box_type] = box;
							break;
					}
					if (this.updateUsedBytes) {
						this.updateUsedBytes(box, ret);
					}
				}
			}
		}
	};

	ISOFile.prototype.checkBuffer = function (ab) {
		if (ab === null || ab === undefined) {
			throw("Buffer must be defined and non empty");
		}
		if (ab.fileStart === undefined) {
			throw("Buffer must have a fileStart property");
		}
		if (ab.byteLength === 0) {
			Log.warn("ISOFile", "Ignoring empty buffer (fileStart: "+ab.fileStart+")");
			this.stream.logBufferLevel();
			return false;
		}
		Log.info("ISOFile", "Processing buffer (fileStart: "+ab.fileStart+")");

		/* mark the bytes in the buffer as not being used yet */
		ab.usedBytes = 0;
		this.stream.insertBuffer(ab);
		this.stream.logBufferLevel();

		if (!this.stream.initialized()) {
			Log.warn("ISOFile", "Not ready to start parsing");
			return false;
		}
		return true;
	};

	/* Processes a new ArrayBuffer (with a fileStart property)
	   Returns the next expected file position, or undefined if not ready to parse */
	ISOFile.prototype.appendBuffer = function(ab, last) {
		var nextFileStart;
		if (!this.checkBuffer(ab)) {
			return;
		}

		/* Parse whatever is in the existing buffers */
		this.parse();

		/* Check if the moovStart callback needs to be called */
		if (this.moovStartFound && !this.moovStartSent) {
			this.moovStartSent = true;
			if (this.onMoovStart) this.onMoovStart();
		}

		if (this.moov) {
			/* A moov box has been entirely parsed */

			/* if this is the first call after the moov is found we initialize the list of samples (may be empty in fragmented files) */
			if (!this.sampleListBuilt) {
				this.buildSampleLists();
				this.sampleListBuilt = true;
			}

			/* We update the sample information if there are any new moof boxes */
			this.updateSampleLists();

			/* If the application needs to be informed that the 'moov' has been found,
			   we create the information object and callback the application */
			if (this.onReady && !this.readySent) {
				this.readySent = true;
				this.onReady(this.getInfo());
			}

			/* See if any sample extraction or segment creation needs to be done with the available samples */
			this.processSamples(last);

			/* Inform about the best range to fetch next */
			if (this.nextSeekPosition) {
				nextFileStart = this.nextSeekPosition;
				this.nextSeekPosition = undefined;
			} else {
				nextFileStart = this.nextParsePosition;
			}
			if (this.stream.getEndFilePositionAfter) {
				nextFileStart = this.stream.getEndFilePositionAfter(nextFileStart);
			}
		} else {
			if (this.nextParsePosition) {
				/* moov has not been parsed but the first buffer was received,
				   the next fetch should probably be the next box start */
				nextFileStart = this.nextParsePosition;
			} else {
				/* No valid buffer has been parsed yet, we cannot know what to parse next */
				nextFileStart = 0;
			}
		}
		if (this.sidx) {
			if (this.onSidx && !this.sidxSent) {
				this.onSidx(this.sidx);
				this.sidxSent = true;
			}
		}
		if (this.meta) {
			if (this.flattenItemInfo && !this.itemListBuilt) {
				this.flattenItemInfo();
				this.itemListBuilt = true;
			}
			if (this.processItems) {
				this.processItems(this.onItem);
			}
		}

		if (this.stream.cleanBuffers) {
			Log.info("ISOFile", "Done processing buffer (fileStart: "+ab.fileStart+") - next buffer to fetch should have a fileStart position of "+nextFileStart);
			this.stream.logBufferLevel();
			this.stream.cleanBuffers();
			this.stream.logBufferLevel(true);
			Log.info("ISOFile", "Sample data size in memory: "+this.getAllocatedSampleDataSize());
		}
		return nextFileStart;
	};

	ISOFile.prototype.getInfo = function() {
		var i, j;
		var movie = {};
		var trak;
		var track;
		var ref;
		var sample_desc;
		var _1904 = (new Date('1904-01-01T00:00:00Z').getTime());

		if (this.moov) {
			movie.hasMoov = true;
			movie.duration = this.moov.mvhd.duration;
			movie.timescale = this.moov.mvhd.timescale;
			movie.isFragmented = (this.moov.mvex != null);
			if (movie.isFragmented && this.moov.mvex.mehd) {
				movie.fragment_duration = this.moov.mvex.mehd.fragment_duration;
			}
			movie.isProgressive = this.isProgressive;
			movie.hasIOD = (this.moov.iods != null);
			movie.brands = [];
			movie.brands.push(this.ftyp.major_brand);
			movie.brands = movie.brands.concat(this.ftyp.compatible_brands);
			movie.created = new Date(_1904+this.moov.mvhd.creation_time*1000);
			movie.modified = new Date(_1904+this.moov.mvhd.modification_time*1000);
			movie.tracks = [];
			movie.audioTracks = [];
			movie.videoTracks = [];
			movie.subtitleTracks = [];
			movie.metadataTracks = [];
			movie.hintTracks = [];
			movie.otherTracks = [];
			for (i = 0; i < this.moov.traks.length; i++) {
				trak = this.moov.traks[i];
				sample_desc = trak.mdia.minf.stbl.stsd.entries[0];
				track = {};
				movie.tracks.push(track);
				track.id = trak.tkhd.track_id;
				track.name = trak.mdia.hdlr.name;
				track.references = [];
				if (trak.tref) {
					for (j = 0; j < trak.tref.boxes.length; j++) {
						ref = {};
						track.references.push(ref);
						ref.type = trak.tref.boxes[j].type;
						ref.track_ids = trak.tref.boxes[j].track_ids;
					}
				}
				if (trak.edts) {
					track.edits = trak.edts.elst.entries;
				}
				track.created = new Date(_1904+trak.tkhd.creation_time*1000);
				track.modified = new Date(_1904+trak.tkhd.modification_time*1000);
				track.movie_duration = trak.tkhd.duration;
				track.movie_timescale = movie.timescale;
				track.layer = trak.tkhd.layer;
				track.alternate_group = trak.tkhd.alternate_group;
				track.volume = trak.tkhd.volume;
				track.matrix = trak.tkhd.matrix;
				track.track_width = trak.tkhd.width/(1<<16);
				track.track_height = trak.tkhd.height/(1<<16);
				track.timescale = trak.mdia.mdhd.timescale;
				track.cts_shift = trak.mdia.minf.stbl.cslg;
				track.duration = trak.mdia.mdhd.duration;
				track.samples_duration = trak.samples_duration;
				track.codec = sample_desc.getCodec();
				track.kind = (trak.udta && trak.udta.kinds.length ? trak.udta.kinds[0] : { schemeURI: "", value: ""});
				track.language = (trak.mdia.elng ? trak.mdia.elng.extended_language : trak.mdia.mdhd.languageString);
				track.nb_samples = trak.samples.length;
				track.size = trak.samples_size;
				track.bitrate = (track.size*8*track.timescale)/track.samples_duration;
				if (sample_desc.isAudio()) {
					track.type = "audio";
					movie.audioTracks.push(track);
					track.audio = {};
					track.audio.sample_rate = sample_desc.getSampleRate();
					track.audio.channel_count = sample_desc.getChannelCount();
					track.audio.sample_size = sample_desc.getSampleSize();
				} else if (sample_desc.isVideo()) {
					track.type = "video";
					movie.videoTracks.push(track);
					track.video = {};
					track.video.width = sample_desc.getWidth();
					track.video.height = sample_desc.getHeight();
				} else if (sample_desc.isSubtitle()) {
					track.type = "subtitles";
					movie.subtitleTracks.push(track);
				} else if (sample_desc.isHint()) {
					track.type = "metadata";
					movie.hintTracks.push(track);
				} else if (sample_desc.isMetadata()) {
					track.type = "metadata";
					movie.metadataTracks.push(track);
				} else {
					track.type = "metadata";
					movie.otherTracks.push(track);
				}
			}
		} else {
			movie.hasMoov = false;
		}
		movie.mime = "";
		if (movie.hasMoov && movie.tracks) {
			if (movie.videoTracks && movie.videoTracks.length > 0) {
				movie.mime += 'video/mp4; codecs=\"';
			} else if (movie.audioTracks && movie.audioTracks.length > 0) {
				movie.mime += 'audio/mp4; codecs=\"';
			} else {
				movie.mime += 'application/mp4; codecs=\"';
			}
			for (i = 0; i < movie.tracks.length; i++) {
				if (i !== 0) movie.mime += ',';
				movie.mime+= movie.tracks[i].codec;
			}
			movie.mime += '\"; profiles=\"';
			movie.mime += this.ftyp.compatible_brands.join();
			movie.mime += '\"';
		}
		return movie;
	};

	ISOFile.prototype.setNextSeekPositionFromSample = function (sample) {
		if (!sample) {
			return;
		}
		if (this.nextSeekPosition) {
			this.nextSeekPosition = Math.min(sample.offset+sample.alreadyRead,this.nextSeekPosition);
		} else {
			this.nextSeekPosition = sample.offset+sample.alreadyRead;
		}
	};

	ISOFile.prototype.processSamples = function(last) {
		var i;
		var trak;
		if (!this.sampleProcessingStarted) return;

		/* For each track marked for fragmentation,
		   check if the next sample is there (i.e. if the sample information is known (i.e. moof has arrived) and if it has been downloaded)
		   and create a fragment with it */
		if (this.isFragmentationInitialized && this.onSegment !== null) {
			for (i = 0; i < this.fragmentedTracks.length; i++) {
				var fragTrak = this.fragmentedTracks[i];
				trak = fragTrak.trak;
				while (trak.nextSample < trak.samples.length && this.sampleProcessingStarted) {
					/* The sample information is there (either because the file is not fragmented and this is not the last sample,
					or because the file is fragmented and the moof for that sample has been received */
					Log.debug("ISOFile", "Creating media fragment on track #"+fragTrak.id +" for sample "+trak.nextSample);
					var result = this.createFragment(fragTrak.id, trak.nextSample, fragTrak.segmentStream);
					if (result) {
						fragTrak.segmentStream = result;
						trak.nextSample++;
					} else {
						/* The fragment could not be created because the media data is not there (not downloaded), wait for it */
						break;
					}
					/* A fragment is created by sample, but the segment is the accumulation in the buffer of these fragments.
					   It is flushed only as requested by the application (nb_samples) to avoid too many callbacks */
					if (trak.nextSample % fragTrak.nb_samples === 0 || (last || trak.nextSample >= trak.samples.length)) {
						Log.info("ISOFile", "Sending fragmented data on track #"+fragTrak.id+" for samples ["+Math.max(0,trak.nextSample-fragTrak.nb_samples)+","+(trak.nextSample-1)+"]");
						Log.info("ISOFile", "Sample data size in memory: "+this.getAllocatedSampleDataSize());
						if (this.onSegment) {
							this.onSegment(fragTrak.id, fragTrak.user, fragTrak.segmentStream.buffer, trak.nextSample, (last || trak.nextSample >= trak.samples.length));
						}
						/* force the creation of a new buffer */
						fragTrak.segmentStream = null;
						if (fragTrak !== this.fragmentedTracks[i]) {
							/* make sure we can stop fragmentation if needed */
							break;
						}
					}
				}
			}
		}

		if (this.onSamples !== null) {
			/* For each track marked for data export,
			   check if the next sample is there (i.e. has been downloaded) and send it */
			for (i = 0; i < this.extractedTracks.length; i++) {
				var extractTrak = this.extractedTracks[i];
				trak = extractTrak.trak;
				while (trak.nextSample < trak.samples.length && this.sampleProcessingStarted) {
					Log.debug("ISOFile", "Exporting on track #"+extractTrak.id +" sample #"+trak.nextSample);
					var sample = this.getSample(trak, trak.nextSample);
					if (sample) {
						trak.nextSample++;
						extractTrak.samples.push(sample);
					} else {
						this.setNextSeekPositionFromSample(trak.samples[trak.nextSample]);
						break;
					}
					if (trak.nextSample % extractTrak.nb_samples === 0 || trak.nextSample >= trak.samples.length) {
						Log.debug("ISOFile", "Sending samples on track #"+extractTrak.id+" for sample "+trak.nextSample);
						if (this.onSamples) {
							this.onSamples(extractTrak.id, extractTrak.user, extractTrak.samples);
						}
						extractTrak.samples = [];
						if (extractTrak !== this.extractedTracks[i]) {
							/* check if the extraction needs to be stopped */
							break;
						}
					}
				}
			}
		}
	};

	/* Find and return specific boxes using recursion and early return */
	ISOFile.prototype.getBox = function(type) {
	  var result = this.getBoxes(type, true);
	  return (result.length ? result[0] : null);
	};

	ISOFile.prototype.getBoxes = function(type, returnEarly) {
	  var result = [];
	  ISOFile._sweep.call(this, type, result, returnEarly);
	  return result;
	};

	ISOFile._sweep = function(type, result, returnEarly) {
	  if (this.type && this.type == type) result.push(this);
	  for (var box in this.boxes) {
	    if (result.length && returnEarly) return;
	    ISOFile._sweep.call(this.boxes[box], type, result, returnEarly);
	  }
	};

	ISOFile.prototype.getTrackSamplesInfo = function(track_id) {
		var track = this.getTrackById(track_id);
		if (track) {
			return track.samples;
		} else {
			return;
		}
	};

	ISOFile.prototype.getTrackSample = function(track_id, number) {
		var track = this.getTrackById(track_id);
		var sample = this.getSample(track, number);
		return sample;
	};

	/* Called by the application to release the resources associated to samples already forwarded to the application */
	ISOFile.prototype.releaseUsedSamples = function (id, sampleNum) {
		var size = 0;
		var trak = this.getTrackById(id);
		if (!trak.lastValidSample) trak.lastValidSample = 0;
		for (var i = trak.lastValidSample; i < sampleNum; i++) {
			size+=this.releaseSample(trak, i);
		}
		Log.info("ISOFile", "Track #"+id+" released samples up to "+sampleNum+" (released size: "+size+", remaining: "+this.samplesDataSize+")");
		trak.lastValidSample = sampleNum;
	};

	ISOFile.prototype.start = function() {
		this.sampleProcessingStarted = true;
		this.processSamples(false);
	};

	ISOFile.prototype.stop = function() {
		this.sampleProcessingStarted = false;
	};

	/* Called by the application to flush the remaining samples (e.g. once the download is finished or when no more samples will be added) */
	ISOFile.prototype.flush = function() {
		Log.info("ISOFile", "Flushing remaining samples");
		this.updateSampleLists();
		this.processSamples(true);
		this.stream.cleanBuffers();
		this.stream.logBufferLevel(true);
	};

	/* Finds the byte offset for a given time on a given track
	   also returns the time of the previous rap */
	ISOFile.prototype.seekTrack = function(time, useRap, trak) {
		var j;
		var sample;
		var seek_offset = Infinity;
		var rap_seek_sample_num = 0;
		var seek_sample_num = 0;
		var timescale;

		if (trak.samples.length === 0) {
			Log.info("ISOFile", "No sample in track, cannot seek! Using time "+Log.getDurationString(0, 1) +" and offset: "+0);
			return { offset: 0, time: 0 };
		}

		for (j = 0; j < trak.samples.length; j++) {
			sample = trak.samples[j];
			if (j === 0) {
				seek_sample_num = 0;
				timescale = sample.timescale;
			} else if (sample.cts > time * sample.timescale) {
				seek_sample_num = j-1;
				break;
			}
			if (useRap && sample.is_sync) {
				rap_seek_sample_num = j;
			}
		}
		if (useRap) {
			seek_sample_num = rap_seek_sample_num;
		}
		time = trak.samples[seek_sample_num].cts;
		trak.nextSample = seek_sample_num;
		while (trak.samples[seek_sample_num].alreadyRead === trak.samples[seek_sample_num].size) {
			// No remaining samples to look for, all are downloaded.
			if (!trak.samples[seek_sample_num + 1]) {
				break;
			}
			seek_sample_num++;
		}
		seek_offset = trak.samples[seek_sample_num].offset+trak.samples[seek_sample_num].alreadyRead;
		Log.info("ISOFile", "Seeking to "+(useRap ? "RAP": "")+" sample #"+trak.nextSample+" on track "+trak.tkhd.track_id+", time "+Log.getDurationString(time, timescale) +" and offset: "+seek_offset);
		return { offset: seek_offset, time: time/timescale };
	};

	ISOFile.prototype.getTrackDuration = function (trak) {
		var sample;

		if (!trak.samples) {
			return Infinity;
		}
		sample = trak.samples[trak.samples.length - 1];
		return (sample.cts + sample.duration) / sample.timescale;
	};

	/* Finds the byte offset in the file corresponding to the given time or to the time of the previous RAP */
	ISOFile.prototype.seek = function(time, useRap) {
		var moov = this.moov;
		var trak;
		var trak_seek_info;
		var i;
		var seek_info = { offset: Infinity, time: Infinity };
		if (!this.moov) {
			throw "Cannot seek: moov not received!";
		} else {
			for (i = 0; i<moov.traks.length; i++) {
				trak = moov.traks[i];
				if (time > this.getTrackDuration(trak)) { // skip tracks that already ended
					continue;
				}
				trak_seek_info = this.seekTrack(time, useRap, trak);
				if (trak_seek_info.offset < seek_info.offset) {
					seek_info.offset = trak_seek_info.offset;
				}
				if (trak_seek_info.time < seek_info.time) {
					seek_info.time = trak_seek_info.time;
				}
			}
			Log.info("ISOFile", "Seeking at time "+Log.getDurationString(seek_info.time, 1)+" needs a buffer with a fileStart position of "+seek_info.offset);
			if (seek_info.offset === Infinity) {
				/* No sample info, in all tracks, cannot seek */
				seek_info = { offset: this.nextParsePosition, time: 0 };
			} else {
				/* check if the seek position is already in some buffer and
				 in that case return the end of that buffer (or of the last contiguous buffer) */
				/* TODO: Should wait until append operations are done */
				seek_info.offset = this.stream.getEndFilePositionAfter(seek_info.offset);
			}
			Log.info("ISOFile", "Adjusted seek position (after checking data already in buffer): "+seek_info.offset);
			return seek_info;
		}
	};

	ISOFile.prototype.equal = function(b) {
		var box_index = 0;
		while (box_index < this.boxes.length && box_index < b.boxes.length) {
			var a_box = this.boxes[box_index];
			var b_box = b.boxes[box_index];
			if (!BoxParser.boxEqual(a_box, b_box)) {
				return false;
			}
			box_index++;
		}
		return true;
	};

	{
		exports$1.ISOFile = ISOFile;
	}
	// file:src/isofile-advanced-parsing.js
	/* position in the current buffer of the beginning of the last box parsed */
	ISOFile.prototype.lastBoxStartPosition = 0;
	/* indicator if the parsing is stuck in the middle of an mdat box */
	ISOFile.prototype.parsingMdat = null;
	/* next file position that the parser needs:
	    - 0 until the first buffer (i.e. fileStart ===0) has been received 
	    - otherwise, the next box start until the moov box has been parsed
	    - otherwise, the position of the next sample to fetch
	 */
	ISOFile.prototype.nextParsePosition = 0;
	/* keep mdat data */
	ISOFile.prototype.discardMdatData = false;

	ISOFile.prototype.processIncompleteBox = function(ret) {
		var box;
		var merged;
		var found;
		
		/* we did not have enough bytes in the current buffer to parse the entire box */
		if (ret.type === "mdat") { 
			/* we had enough bytes to get its type and size and it's an 'mdat' */
			
			/* special handling for mdat boxes, since we don't actually need to parse it linearly 
			   we create the box */
			box = new BoxParser[ret.type+"Box"](ret.size);	
			this.parsingMdat = box;
			this.boxes.push(box);
			this.mdats.push(box);			
			box.start = ret.start;
			box.hdr_size = ret.hdr_size;
			this.stream.addUsedBytes(box.hdr_size);

			/* indicate that the parsing should start from the end of the box */
			this.lastBoxStartPosition = box.start + box.size;
	 		/* let's see if we have the end of the box in the other buffers */
			found = this.stream.seek(box.start + box.size, false, this.discardMdatData);
			if (found) {
				/* found the end of the box */
				this.parsingMdat = null;
				/* let's see if we can parse more in this buffer */
				return true;
			} else {
				/* 'mdat' end not found in the existing buffers */
				/* determine the next position in the file to start parsing from */
				if (!this.moovStartFound) {
					/* moov not find yet, 
					   the file probably has 'mdat' at the beginning, and 'moov' at the end, 
					   indicate that the downloader should not try to download those bytes now */
					this.nextParsePosition = box.start + box.size;
				} else {
					/* we have the start of the moov box, 
					   the next bytes should try to complete the current 'mdat' */
					this.nextParsePosition = this.stream.findEndContiguousBuf();
				}
				/* not much we can do, wait for more buffers to arrive */
				return false;
			}
		} else {
			/* box is incomplete, we may not even know its type */
			if (ret.type === "moov") { 
				/* the incomplete box is a 'moov' box */
				this.moovStartFound = true;
				if (this.mdats.length === 0) {
					this.isProgressive = true;
				}
			}
			/* either it's not an mdat box (and we need to parse it, we cannot skip it)
			   (TODO: we could skip 'free' boxes ...)
				   or we did not have enough data to parse the type and size of the box, 
			   we try to concatenate the current buffer with the next buffer to restart parsing */
			merged = (this.stream.mergeNextBuffer ? this.stream.mergeNextBuffer() : false);
			if (merged) {
				/* The next buffer was contiguous, the merging succeeded,
				   we can now continue parsing, 
				   the next best position to parse is at the end of this new buffer */
				this.nextParsePosition = this.stream.getEndPosition();
				return true;
			} else {
				/* we cannot concatenate existing buffers because they are not contiguous or because there is no additional buffer */
				/* The next best position to parse is still at the end of this old buffer */
				if (!ret.type) {
					/* There were not enough bytes in the buffer to parse the box type and length,
					   the next fetch should retrieve those missing bytes, i.e. the next bytes after this buffer */
					this.nextParsePosition = this.stream.getEndPosition();
				} else {
					/* we had enough bytes to parse size and type of the incomplete box
					   if we haven't found yet the moov box, skip this one and try the next one 
					   if we have found the moov box, let's continue linear parsing */
					if (this.moovStartFound) {
						this.nextParsePosition = this.stream.getEndPosition();
					} else {
						this.nextParsePosition = this.stream.getPosition() + ret.size;
					}
				}
				return false;
			}
		}
	};

	ISOFile.prototype.hasIncompleteMdat = function () {
		return (this.parsingMdat !== null);
	};

	ISOFile.prototype.processIncompleteMdat = function () {
		var box;
		var found;
		
		/* we are in the parsing of an incomplete mdat box */
		box = this.parsingMdat;

		found = this.stream.seek(box.start + box.size, false, this.discardMdatData);
		if (found) {
			Log.debug("ISOFile", "Found 'mdat' end in buffered data");
			/* the end of the mdat has been found */ 
			this.parsingMdat = null;
			/* we can parse more in this buffer */
			return true;
		} else {
			/* we don't have the end of this mdat yet, 
			   indicate that the next byte to fetch is the end of the buffers we have so far, 
			   return and wait for more buffer to come */
			this.nextParsePosition = this.stream.findEndContiguousBuf();
			return false;
		}
	};

	ISOFile.prototype.restoreParsePosition = function() {
		/* Reposition at the start position of the previous box not entirely parsed */
		return this.stream.seek(this.lastBoxStartPosition, true, this.discardMdatData);
	};

	ISOFile.prototype.saveParsePosition = function() {
		/* remember the position of the box start in case we need to roll back (if the box is incomplete) */
		this.lastBoxStartPosition = this.stream.getPosition();	
	};

	ISOFile.prototype.updateUsedBytes = function(box, ret) {
		if (this.stream.addUsedBytes) {
			if (box.type === "mdat") {
				/* for an mdat box, only its header is considered used, other bytes will be used when sample data is requested */
				this.stream.addUsedBytes(box.hdr_size);
				if (this.discardMdatData) {
					this.stream.addUsedBytes(box.size-box.hdr_size);
				}
			} else {
				/* for all other boxes, the entire box data is considered used */
				this.stream.addUsedBytes(box.size);
			}	
		}
	};
	// file:src/isofile-advanced-creation.js
	ISOFile.prototype.add = BoxParser.Box.prototype.add;
	ISOFile.prototype.addBox = BoxParser.Box.prototype.addBox;

	ISOFile.prototype.init = function (_options) {
		var options = _options || {}; 
		this.add("ftyp").set("major_brand", (options.brands && options.brands[0]) || "iso4")
								   .set("minor_version", 0)
								   .set("compatible_brands", options.brands || ["iso4"]);
		var moov = this.add("moov");
		moov.add("mvhd").set("timescale", options.timescale || 600)
						.set("rate", options.rate || 1<<16)
						.set("creation_time", 0)
						.set("modification_time", 0)
						.set("duration", options.duration || 0)
						.set("volume", (options.width) ? 0 : 0x0100)
						.set("matrix", [ 1<<16, 0, 0, 0, 1<<16, 0, 0, 0, 0x40000000])
						.set("next_track_id", 1);
		moov.add("mvex");
		return this;
	};

	ISOFile.prototype.addTrack = function (_options) {
		if (!this.moov) {
			this.init(_options);
		}

		var options = _options || {}; 
		options.width = options.width || 320;
		options.height = options.height || 320;
		options.id = options.id || this.moov.mvhd.next_track_id;
		options.type = options.type || "avc1";

		var trak = this.moov.add("trak");
		this.moov.mvhd.next_track_id = options.id+1;
		trak.add("tkhd").set("flags",BoxParser.TKHD_FLAG_ENABLED | 
									 BoxParser.TKHD_FLAG_IN_MOVIE | 
									 BoxParser.TKHD_FLAG_IN_PREVIEW)
						.set("creation_time",0)
						.set("modification_time", 0)
						.set("track_id", options.id)
						.set("duration", options.duration || 0)
						.set("layer", options.layer || 0)
						.set("alternate_group", 0)
						.set("volume", 1)
						.set("matrix", [ 1<<16, 0, 0, 0, 1<<16, 0, 0, 0, 0x40000000])
						.set("width", options.width << 16)
						.set("height", options.height << 16);

		var mdia = trak.add("mdia");
		mdia.add("mdhd").set("creation_time", 0)
						.set("modification_time", 0)
						.set("timescale", options.timescale || 1)
						.set("duration", options.media_duration || 0)
						.set("language", options.language || "und");

		mdia.add("hdlr").set("handler", options.hdlr || "vide")
						.set("name", options.name || "Track created with MP4Box.js");

		mdia.add("elng").set("extended_language", options.language || "fr-FR");

		var minf = mdia.add("minf");
		if (BoxParser[options.type+"SampleEntry"] === undefined) return;
		var sample_description_entry = new BoxParser[options.type+"SampleEntry"]();
		sample_description_entry.data_reference_index = 1;
		var media_type = "";
		for (var mediaType in BoxParser.sampleEntryCodes) {
			var codes = BoxParser.sampleEntryCodes[mediaType];
			for (var i = 0; i < codes.length; i++) {
				if (codes.indexOf(options.type) > -1) {
					media_type = mediaType;
					break;
				}
			}
		}
		switch(media_type) {
			case "Visual":
				minf.add("vmhd").set("graphicsmode",0).set("opcolor", [ 0, 0, 0 ]);
				sample_description_entry.set("width", options.width)
							.set("height", options.height)
							.set("horizresolution", 0x48<<16)
							.set("vertresolution", 0x48<<16)
							.set("frame_count", 1)
							.set("compressorname", options.type+" Compressor")
							.set("depth", 0x18);
				if (options.avcDecoderConfigRecord) {
					var avcC = new BoxParser.avcCBox();
					avcC.parse(new MP4BoxStream(options.avcDecoderConfigRecord));
					sample_description_entry.addBox(avcC);
				} else if (options.hevcDecoderConfigRecord) {
					var hvcC = new BoxParser.hvcCBox();
					hvcC.parse(new MP4BoxStream(options.hevcDecoderConfigRecord));
					sample_description_entry.addBox(hvcC);
				} else if (options.vpcDecoderConfigRecord) {
					var vpcC = new BoxParser.vpcCBox();
					vpcC.parse(new MP4BoxStream(options.vpcDecoderConfigRecord));
					sample_description_entry.addBox(vpcC);
				}
				break;
			case "Audio":
				minf.add("smhd").set("balance", options.balance || 0);
				sample_description_entry.set("channel_count", options.channel_count || 2)
							.set("samplesize", options.samplesize || 16)
							.set("samplerate", options.samplerate || 1<<16);
				break;
			case "Hint":
				minf.add("hmhd"); // TODO: add properties
				break;
			case "Subtitle":
				minf.add("sthd");
				switch (options.type) {
					case "stpp":
						sample_description_entry.set("namespace", options.namespace || "nonamespace")
									.set("schema_location", options.schema_location || "")
									.set("auxiliary_mime_types", options.auxiliary_mime_types || "");
						break;
				}
				break;
			case "Metadata":
				minf.add("nmhd");
				break;
			case "System":
				minf.add("nmhd");
				break;
			default:
				minf.add("nmhd");
				break;
		}
		if (options.description) {
			sample_description_entry.addBox(options.description);
		}
		if (options.description_boxes) {
			options.description_boxes.forEach(function (b) {
				sample_description_entry.addBox(b);
			});
		}
		minf.add("dinf").add("dref").addEntry((new BoxParser["url Box"]()).set("flags", 0x1));
		var stbl = minf.add("stbl");
		stbl.add("stsd").addEntry(sample_description_entry);
		stbl.add("stts").set("sample_counts", [])
						.set("sample_deltas", []);
		stbl.add("stsc").set("first_chunk", [])
						.set("samples_per_chunk", [])
						.set("sample_description_index", []);
		stbl.add("stco").set("chunk_offsets", []);
		stbl.add("stsz").set("sample_sizes", []);

		this.moov.mvex.add("trex").set("track_id", options.id)
								  .set("default_sample_description_index", options.default_sample_description_index || 1)
								  .set("default_sample_duration", options.default_sample_duration || 0)
								  .set("default_sample_size", options.default_sample_size || 0)
								  .set("default_sample_flags", options.default_sample_flags || 0);
		this.buildTrakSampleLists(trak);
		return options.id;
	};

	BoxParser.Box.prototype.computeSize = function(stream_) {
		var stream = stream_ || new DataStream();
		stream.endianness = DataStream.BIG_ENDIAN;
		this.write(stream);
	};

	ISOFile.prototype.addSample = function (track_id, data, _options) {
		var options = _options || {};
		var sample = {};
		var trak = this.getTrackById(track_id);
		if (trak === null) return;
	    sample.number = trak.samples.length;
		sample.track_id = trak.tkhd.track_id;
		sample.timescale = trak.mdia.mdhd.timescale;
		sample.description_index = (options.sample_description_index ? options.sample_description_index - 1: 0);
		sample.description = trak.mdia.minf.stbl.stsd.entries[sample.description_index];
		sample.data = data;
		sample.size = data.byteLength;
		sample.alreadyRead = sample.size;
		sample.duration = options.duration || 1;
		sample.cts = options.cts || 0;
		sample.dts = options.dts || 0;
		sample.is_sync = options.is_sync || false;
		sample.is_leading = options.is_leading || 0;
		sample.depends_on = options.depends_on || 0;
		sample.is_depended_on = options.is_depended_on || 0;
		sample.has_redundancy = options.has_redundancy || 0;
		sample.degradation_priority = options.degradation_priority || 0;
		sample.offset = 0;
		sample.subsamples = options.subsamples;
		trak.samples.push(sample);
		trak.samples_size += sample.size;
		trak.samples_duration += sample.duration;
		if (trak.first_dts === undefined) {
			trak.first_dts = options.dts;
		}

		this.processSamples();
		
		var moof = this.createSingleSampleMoof(sample);
		this.addBox(moof);
		moof.computeSize();
		/* adjusting the data_offset now that the moof size is known*/
		moof.trafs[0].truns[0].data_offset = moof.size+8; //8 is mdat header
		this.add("mdat").data = new Uint8Array(data);
		return sample;
	};

	ISOFile.prototype.createSingleSampleMoof = function(sample) {
		var sample_flags = 0;
		if (sample.is_sync)
			sample_flags = (1 << 25);  // sample_depends_on_none (I picture)
		else
			sample_flags = (1 << 16);  // non-sync

		var moof = new BoxParser.moofBox();
		moof.add("mfhd").set("sequence_number", this.nextMoofNumber);
		this.nextMoofNumber++;
		var traf = moof.add("traf");
		var trak = this.getTrackById(sample.track_id);
		traf.add("tfhd").set("track_id", sample.track_id)
						.set("flags", BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF);
		traf.add("tfdt").set("baseMediaDecodeTime", (sample.dts - (trak.first_dts || 0)));
		traf.add("trun").set("flags", BoxParser.TRUN_FLAGS_DATA_OFFSET | BoxParser.TRUN_FLAGS_DURATION | 
					 				  BoxParser.TRUN_FLAGS_SIZE | BoxParser.TRUN_FLAGS_FLAGS | 
					 				  BoxParser.TRUN_FLAGS_CTS_OFFSET)
						.set("data_offset",0)
						.set("first_sample_flags",0)
						.set("sample_count",1)
						.set("sample_duration",[sample.duration])
						.set("sample_size",[sample.size])
						.set("sample_flags",[sample_flags])
						.set("sample_composition_time_offset", [sample.cts - sample.dts]);
		return moof;
	};

	// file:src/isofile-sample-processing.js
	/* Index of the last moof box received */
	ISOFile.prototype.lastMoofIndex = 0;

	/* size of the buffers allocated for samples */
	ISOFile.prototype.samplesDataSize = 0;

	/* Resets all sample tables */
	ISOFile.prototype.resetTables = function () {
		var i;
		var trak, stco, stsc, stsz, stts, ctts, stss;
		this.initial_duration = this.moov.mvhd.duration;
		this.moov.mvhd.duration = 0;
		for (i = 0; i < this.moov.traks.length; i++) {
			trak = this.moov.traks[i];
			trak.tkhd.duration = 0;
			trak.mdia.mdhd.duration = 0;
			stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
			stco.chunk_offsets = [];
			stsc = trak.mdia.minf.stbl.stsc;
			stsc.first_chunk = [];
			stsc.samples_per_chunk = [];
			stsc.sample_description_index = [];
			stsz = trak.mdia.minf.stbl.stsz || trak.mdia.minf.stbl.stz2;
			stsz.sample_sizes = [];
			stts = trak.mdia.minf.stbl.stts;
			stts.sample_counts = [];
			stts.sample_deltas = [];
			ctts = trak.mdia.minf.stbl.ctts;
			if (ctts) {
				ctts.sample_counts = [];
				ctts.sample_offsets = [];
			}
			stss = trak.mdia.minf.stbl.stss;
			var k = trak.mdia.minf.stbl.boxes.indexOf(stss);
			if (k != -1) trak.mdia.minf.stbl.boxes[k] = null;
		}
	};

	ISOFile.initSampleGroups = function(trak, traf, sbgps, trak_sgpds, traf_sgpds) {
		var l;
		var k;
		var sample_group_info;
		var sample_group_key;
		function SampleGroupInfo(_type, _parameter, _sbgp) {
			this.grouping_type = _type;
			this.grouping_type_parameter = _parameter;
			this.sbgp = _sbgp;
			this.last_sample_in_run = -1;
			this.entry_index = -1;		
		}
		if (traf) {
			traf.sample_groups_info = [];
		} 
		if (!trak.sample_groups_info) {
			trak.sample_groups_info = [];
		}
		for (k = 0; k < sbgps.length; k++) {
			sample_group_key = sbgps[k].grouping_type +"/"+ sbgps[k].grouping_type_parameter;
			sample_group_info = new SampleGroupInfo(sbgps[k].grouping_type, sbgps[k].grouping_type_parameter, sbgps[k]);
			if (traf) {
				traf.sample_groups_info[sample_group_key] = sample_group_info;
			}
			if (!trak.sample_groups_info[sample_group_key]) {
				trak.sample_groups_info[sample_group_key] = sample_group_info;
			}
			for (l=0; l <trak_sgpds.length; l++) {
				if (trak_sgpds[l].grouping_type === sbgps[k].grouping_type) {
					sample_group_info.description = trak_sgpds[l];
					sample_group_info.description.used = true;
				}
			}
			if (traf_sgpds) {
				for (l=0; l <traf_sgpds.length; l++) {
					if (traf_sgpds[l].grouping_type === sbgps[k].grouping_type) {
						sample_group_info.fragment_description = traf_sgpds[l];
						sample_group_info.fragment_description.used = true;
						sample_group_info.is_fragment = true;
					}
				}			
			}
		}
		if (!traf) {
			for (k = 0; k < trak_sgpds.length; k++) {
				if (!trak_sgpds[k].used && trak_sgpds[k].version >= 2) {
					sample_group_key = trak_sgpds[k].grouping_type +"/0";
					sample_group_info = new SampleGroupInfo(trak_sgpds[k].grouping_type, 0);
					if (!trak.sample_groups_info[sample_group_key]) {
						trak.sample_groups_info[sample_group_key] = sample_group_info;
					}
				}
			}
		} else {
			if (traf_sgpds) {
				for (k = 0; k < traf_sgpds.length; k++) {
					if (!traf_sgpds[k].used && traf_sgpds[k].version >= 2) {
						sample_group_key = traf_sgpds[k].grouping_type +"/0";
						sample_group_info = new SampleGroupInfo(traf_sgpds[k].grouping_type, 0);
						sample_group_info.is_fragment = true;
						if (!traf.sample_groups_info[sample_group_key]) {
							traf.sample_groups_info[sample_group_key] = sample_group_info;
						}
					}
				}
			}
		}
	};

	ISOFile.setSampleGroupProperties = function(trak, sample, sample_number, sample_groups_info) {
		var k;
		var index;
		sample.sample_groups = [];
		for (k in sample_groups_info) {
			sample.sample_groups[k] = {};
			sample.sample_groups[k].grouping_type = sample_groups_info[k].grouping_type;
			sample.sample_groups[k].grouping_type_parameter = sample_groups_info[k].grouping_type_parameter;
			if (sample_number >= sample_groups_info[k].last_sample_in_run) {
				if (sample_groups_info[k].last_sample_in_run < 0) {
					sample_groups_info[k].last_sample_in_run = 0;
				}
				sample_groups_info[k].entry_index++;	
				if (sample_groups_info[k].entry_index <= sample_groups_info[k].sbgp.entries.length - 1) {
					sample_groups_info[k].last_sample_in_run += sample_groups_info[k].sbgp.entries[sample_groups_info[k].entry_index].sample_count;
				}
			}
			if (sample_groups_info[k].entry_index <= sample_groups_info[k].sbgp.entries.length - 1) {
				sample.sample_groups[k].group_description_index = sample_groups_info[k].sbgp.entries[sample_groups_info[k].entry_index].group_description_index;
			} else {
				sample.sample_groups[k].group_description_index = -1; // special value for not defined
			}
			if (sample.sample_groups[k].group_description_index !== 0) {
				var description;
				if (sample_groups_info[k].fragment_description) {
					description = sample_groups_info[k].fragment_description;
				} else {
					description = sample_groups_info[k].description;
				}
				if (sample.sample_groups[k].group_description_index > 0) {
					if (sample.sample_groups[k].group_description_index > 65535) {
						index = (sample.sample_groups[k].group_description_index >> 16)-1;
					} else {
						index = sample.sample_groups[k].group_description_index-1;
					}
					if (description && index >= 0) {
						sample.sample_groups[k].description = description.entries[index];
					}
				} else {
					if (description && description.version >= 2) {
						if (description.default_group_description_index > 0) {								
							sample.sample_groups[k].description = description.entries[description.default_group_description_index-1];
						}
					}
				}
			}
		}
	};

	ISOFile.process_sdtp = function (sdtp, sample, number) {
		if (!sample) {
			return;
		}
		if (sdtp) {
			sample.is_leading = sdtp.is_leading[number];
			sample.depends_on = sdtp.sample_depends_on[number];
			sample.is_depended_on = sdtp.sample_is_depended_on[number];
			sample.has_redundancy = sdtp.sample_has_redundancy[number];
		} else {
			sample.is_leading = 0;
			sample.depends_on = 0;
			sample.is_depended_on = 0;
			sample.has_redundancy = 0;
		}	
	};

	/* Build initial sample list from  sample tables */
	ISOFile.prototype.buildSampleLists = function() {	
		var i;
		var trak;
		for (i = 0; i < this.moov.traks.length; i++) {
			trak = this.moov.traks[i];
			this.buildTrakSampleLists(trak);
		}
	};

	ISOFile.prototype.buildTrakSampleLists = function(trak) {	
		var j;
		var stco, stsc, stsz, stts, ctts, stss, stsd, subs, sbgps, sgpds, stdp;
		var chunk_run_index, chunk_index, last_chunk_in_run, offset_in_chunk, last_sample_in_chunk;
		var last_sample_in_stts_run, stts_run_index, last_sample_in_ctts_run, ctts_run_index, last_stss_index, subs_entry_index, last_subs_sample_index;

		trak.samples = [];
		trak.samples_duration = 0;
		trak.samples_size = 0;
		stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
		stsc = trak.mdia.minf.stbl.stsc;
		stsz = trak.mdia.minf.stbl.stsz || trak.mdia.minf.stbl.stz2;
		stts = trak.mdia.minf.stbl.stts;
		ctts = trak.mdia.minf.stbl.ctts;
		stss = trak.mdia.minf.stbl.stss;
		stsd = trak.mdia.minf.stbl.stsd;
		subs = trak.mdia.minf.stbl.subs;
		stdp = trak.mdia.minf.stbl.stdp;
		sbgps = trak.mdia.minf.stbl.sbgps;
		sgpds = trak.mdia.minf.stbl.sgpds;
		
		last_sample_in_stts_run = -1;
		stts_run_index = -1;
		last_sample_in_ctts_run = -1;
		ctts_run_index = -1;
		last_stss_index = 0;
		subs_entry_index = 0;
		last_subs_sample_index = 0;		

		ISOFile.initSampleGroups(trak, null, sbgps, sgpds);

		if (typeof stsz === "undefined") {
			return;
		}

		/* we build the samples one by one and compute their properties */
		for (j = 0; j < stsz.sample_sizes.length; j++) {
			var sample = {};
			sample.number = j;
			sample.track_id = trak.tkhd.track_id;
			sample.timescale = trak.mdia.mdhd.timescale;
			sample.alreadyRead = 0;
			trak.samples[j] = sample;
			/* size can be known directly */
			sample.size = stsz.sample_sizes[j];
			trak.samples_size += sample.size;
			/* computing chunk-based properties (offset, sample description index)*/
			if (j === 0) {				
				chunk_index = 1; /* the first sample is in the first chunk (chunk indexes are 1-based) */
				chunk_run_index = 0; /* the first chunk is the first entry in the first_chunk table */
				sample.chunk_index = chunk_index;
				sample.chunk_run_index = chunk_run_index;
				last_sample_in_chunk = stsc.samples_per_chunk[chunk_run_index];
				offset_in_chunk = 0;

				/* Is there another entry in the first_chunk table ? */
				if (chunk_run_index + 1 < stsc.first_chunk.length) {
					/* The last chunk in the run is the chunk before the next first chunk */
					last_chunk_in_run = stsc.first_chunk[chunk_run_index+1]-1; 	
				} else {
					/* There is only one entry in the table, it is valid for all future chunks*/
					last_chunk_in_run = Infinity;
				}
			} else {
				if (j < last_sample_in_chunk) {
					/* the sample is still in the current chunk */
					sample.chunk_index = chunk_index;
					sample.chunk_run_index = chunk_run_index;
				} else {
					/* the sample is in the next chunk */
					chunk_index++;
					sample.chunk_index = chunk_index;
					/* reset the accumulated offset in the chunk */
					offset_in_chunk = 0;
					if (chunk_index <= last_chunk_in_run) ; else {
						chunk_run_index++;
						/* Is there another entry in the first_chunk table ? */
						if (chunk_run_index + 1 < stsc.first_chunk.length) {
							/* The last chunk in the run is the chunk before the next first chunk */
							last_chunk_in_run = stsc.first_chunk[chunk_run_index+1]-1; 	
						} else {
							/* There is only one entry in the table, it is valid for all future chunks*/
							last_chunk_in_run = Infinity;
						}
						
					}
					sample.chunk_run_index = chunk_run_index;
					last_sample_in_chunk += stsc.samples_per_chunk[chunk_run_index];
				}
			}

			sample.description_index = stsc.sample_description_index[sample.chunk_run_index]-1;
			sample.description = stsd.entries[sample.description_index];
			sample.offset = stco.chunk_offsets[sample.chunk_index-1] + offset_in_chunk; /* chunk indexes are 1-based */
			offset_in_chunk += sample.size;

			/* setting dts, cts, duration and rap flags */
			if (j > last_sample_in_stts_run) {
				stts_run_index++;
				if (last_sample_in_stts_run < 0) {
					last_sample_in_stts_run = 0;
				}
				last_sample_in_stts_run += stts.sample_counts[stts_run_index];				
			}
			if (j > 0) {
				trak.samples[j-1].duration = stts.sample_deltas[stts_run_index];
				trak.samples_duration += trak.samples[j-1].duration;
				sample.dts = trak.samples[j-1].dts + trak.samples[j-1].duration;
			} else {
				sample.dts = 0;
			}
			if (ctts) {
				if (j >= last_sample_in_ctts_run) {
					ctts_run_index++;
					if (last_sample_in_ctts_run < 0) {
						last_sample_in_ctts_run = 0;
					}
					last_sample_in_ctts_run += ctts.sample_counts[ctts_run_index];				
				}
				sample.cts = trak.samples[j].dts + ctts.sample_offsets[ctts_run_index];
			} else {
				sample.cts = sample.dts;
			}
			if (stss) {
				if (j == stss.sample_numbers[last_stss_index] - 1) { // sample numbers are 1-based
					sample.is_sync = true;
					last_stss_index++;
				} else {
					sample.is_sync = false;				
					sample.degradation_priority = 0;
				}
				if (subs) {
					if (subs.entries[subs_entry_index].sample_delta + last_subs_sample_index == j+1) {
						sample.subsamples = subs.entries[subs_entry_index].subsamples;
						last_subs_sample_index += subs.entries[subs_entry_index].sample_delta;
						subs_entry_index++;
					}
				}
			} else {
				sample.is_sync = true;
			}
			ISOFile.process_sdtp(trak.mdia.minf.stbl.sdtp, sample, sample.number);
			if (stdp) {
				sample.degradation_priority = stdp.priority[j];
			} else {
				sample.degradation_priority = 0;
			}
			if (subs) {
				if (subs.entries[subs_entry_index].sample_delta + last_subs_sample_index == j) {
					sample.subsamples = subs.entries[subs_entry_index].subsamples;
					last_subs_sample_index += subs.entries[subs_entry_index].sample_delta;
				}
			}
			if (sbgps.length > 0 || sgpds.length > 0) {
				ISOFile.setSampleGroupProperties(trak, sample, j, trak.sample_groups_info);
			}
		}
		if (j>0) {
			trak.samples[j-1].duration = Math.max(trak.mdia.mdhd.duration - trak.samples[j-1].dts, 0);
			trak.samples_duration += trak.samples[j-1].duration;
		}
	};

	/* Update sample list when new 'moof' boxes are received */
	ISOFile.prototype.updateSampleLists = function() {	
		var i, j, k;
		var default_sample_description_index, default_sample_duration, default_sample_size, default_sample_flags;
		var last_run_position;
		var box, moof, traf, trak, trex;
		var sample;
		var sample_flags;
		
		if (this.moov === undefined) {
			return;
		}
		/* if the input file is fragmented and fetched in multiple downloads, we need to update the list of samples */
		while (this.lastMoofIndex < this.moofs.length) {
			box = this.moofs[this.lastMoofIndex];
			this.lastMoofIndex++;
			if (box.type == "moof") {
				moof = box;
				for (i = 0; i < moof.trafs.length; i++) {
					traf = moof.trafs[i];
					trak = this.getTrackById(traf.tfhd.track_id);
					if (trak.samples == null) trak.samples = [];

					trex = this.getTrexById(traf.tfhd.track_id);
					if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DESC) {
						default_sample_description_index = traf.tfhd.default_sample_description_index;
					} else {
						default_sample_description_index = (trex ? trex.default_sample_description_index: 1);
					}
					if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_DUR) {
						default_sample_duration = traf.tfhd.default_sample_duration;
					} else {
						default_sample_duration = (trex ? trex.default_sample_duration : 0);
					}
					if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_SIZE) {
						default_sample_size = traf.tfhd.default_sample_size;
					} else {
						default_sample_size = (trex ? trex.default_sample_size : 0);
					}
					if (traf.tfhd.flags & BoxParser.TFHD_FLAG_SAMPLE_FLAGS) {
						default_sample_flags = traf.tfhd.default_sample_flags;
					} else {
						default_sample_flags = (trex ? trex.default_sample_flags : 0);
					}
					traf.sample_number = 0;
					/* process sample groups */
					if (traf.sbgps.length > 0) {
						ISOFile.initSampleGroups(trak, traf, traf.sbgps, trak.mdia.minf.stbl.sgpds, traf.sgpds);
					}
					for (j = 0; j < traf.truns.length; j++) {
						var trun = traf.truns[j];
						for (k = 0; k < trun.sample_count; k++) {
							sample = {};
							sample.moof_number = this.lastMoofIndex;
							sample.number_in_traf = traf.sample_number;
							traf.sample_number++;
				            sample.number = trak.samples.length;
							traf.first_sample_index = trak.samples.length;
							trak.samples.push(sample);
							sample.track_id = trak.tkhd.track_id;
							sample.timescale = trak.mdia.mdhd.timescale;
							sample.description_index = default_sample_description_index-1;
							sample.description = trak.mdia.minf.stbl.stsd.entries[sample.description_index];
							sample.size = default_sample_size;
							if (trun.flags & BoxParser.TRUN_FLAGS_SIZE) {
								sample.size = trun.sample_size[k];
							}
							trak.samples_size += sample.size;
							sample.duration = default_sample_duration;
							if (trun.flags & BoxParser.TRUN_FLAGS_DURATION) {
								sample.duration = trun.sample_duration[k];
							}
							trak.samples_duration += sample.duration;
							if (trak.first_traf_merged || k > 0) {
								sample.dts = trak.samples[trak.samples.length-2].dts+trak.samples[trak.samples.length-2].duration;
							} else {
								if (traf.tfdt) {
									sample.dts = traf.tfdt.baseMediaDecodeTime;
								} else {
									sample.dts = 0;
								}
								trak.first_traf_merged = true;
							}
							sample.cts = sample.dts;
							if (trun.flags & BoxParser.TRUN_FLAGS_CTS_OFFSET) {
								sample.cts = sample.dts + trun.sample_composition_time_offset[k];
							}
							sample_flags = default_sample_flags;
							if (trun.flags & BoxParser.TRUN_FLAGS_FLAGS) {
								sample_flags = trun.sample_flags[k];
							} else if (k === 0 && (trun.flags & BoxParser.TRUN_FLAGS_FIRST_FLAG)) {
								sample_flags = trun.first_sample_flags;
							}
							sample.is_sync = ((sample_flags >> 16 & 0x1) ? false : true);
							sample.is_leading = (sample_flags >> 26 & 0x3);
							sample.depends_on = (sample_flags >> 24 & 0x3);
							sample.is_depended_on = (sample_flags >> 22 & 0x3);
							sample.has_redundancy = (sample_flags >> 20 & 0x3);
							sample.degradation_priority = (sample_flags & 0xFFFF);
							//ISOFile.process_sdtp(traf.sdtp, sample, sample.number_in_traf);
							var bdop = (traf.tfhd.flags & BoxParser.TFHD_FLAG_BASE_DATA_OFFSET) ? true : false;
							var dbim = (traf.tfhd.flags & BoxParser.TFHD_FLAG_DEFAULT_BASE_IS_MOOF) ? true : false;
							var dop = (trun.flags & BoxParser.TRUN_FLAGS_DATA_OFFSET) ? true : false;
							var bdo = 0;
							if (!bdop) {
								if (!dbim) {
									if (j === 0) { // the first track in the movie fragment
										bdo = moof.start; // the position of the first byte of the enclosing Movie Fragment Box
									} else {
										bdo = last_run_position; // end of the data defined by the preceding *track* (irrespective of the track id) fragment in the moof
									}
								} else {
									bdo = moof.start;
								}
							} else {
								bdo = traf.tfhd.base_data_offset;
							}
							if (j === 0 && k === 0) {
								if (dop) {
									sample.offset = bdo + trun.data_offset; // If the data-offset is present, it is relative to the base-data-offset established in the track fragment header
								} else {
									sample.offset = bdo; // the data for this run starts the base-data-offset defined by the track fragment header
								}
							} else {
								sample.offset = last_run_position; // this run starts immediately after the data of the previous run
							}
							last_run_position = sample.offset + sample.size;
							if (traf.sbgps.length > 0 || traf.sgpds.length > 0 ||
								trak.mdia.minf.stbl.sbgps.length > 0 || trak.mdia.minf.stbl.sgpds.length > 0) {
								ISOFile.setSampleGroupProperties(trak, sample, sample.number_in_traf, traf.sample_groups_info);
							}
						}
					}
					if (traf.subs) {
						trak.has_fragment_subsamples = true;
						var sample_index = traf.first_sample_index;
						for (j = 0; j < traf.subs.entries.length; j++) {
							sample_index += traf.subs.entries[j].sample_delta;
							sample = trak.samples[sample_index-1];
							sample.subsamples = traf.subs.entries[j].subsamples;
						}					
					}
				}
			}
		}	
	};

	/* Try to get sample data for a given sample:
	   returns null if not found
	   returns the same sample if already requested
	 */
	ISOFile.prototype.getSample = function(trak, sampleNum) {	
		var buffer;
		var sample = trak.samples[sampleNum];
		
		if (!this.moov) {
			return null;
		}

		if (!sample.data) {
			/* Not yet fetched */
			sample.data = new Uint8Array(sample.size);
			sample.alreadyRead = 0;
			this.samplesDataSize += sample.size;
			Log.debug("ISOFile", "Allocating sample #"+sampleNum+" on track #"+trak.tkhd.track_id+" of size "+sample.size+" (total: "+this.samplesDataSize+")");
		} else if (sample.alreadyRead == sample.size) {
			/* Already fetched entirely */
			return sample;
		}

		/* The sample has only been partially fetched, we need to check in all buffers */
		while(true) {
			var index =	this.stream.findPosition(true, sample.offset + sample.alreadyRead, false);
			if (index > -1) {
				buffer = this.stream.buffers[index];
				var lengthAfterStart = buffer.byteLength - (sample.offset + sample.alreadyRead - buffer.fileStart);
				if (sample.size - sample.alreadyRead <= lengthAfterStart) {
					/* the (rest of the) sample is entirely contained in this buffer */

					Log.debug("ISOFile","Getting sample #"+sampleNum+" data (alreadyRead: "+sample.alreadyRead+" offset: "+
						(sample.offset+sample.alreadyRead - buffer.fileStart)+" read size: "+(sample.size - sample.alreadyRead)+" full size: "+sample.size+")");

					DataStream.memcpy(sample.data.buffer, sample.alreadyRead,
					                  buffer, sample.offset+sample.alreadyRead - buffer.fileStart, sample.size - sample.alreadyRead);

					/* update the number of bytes used in this buffer and check if it needs to be removed */
					buffer.usedBytes += sample.size - sample.alreadyRead;
					this.stream.logBufferLevel();

					sample.alreadyRead = sample.size;

					return sample;
				} else {
					/* the sample does not end in this buffer */

					if (lengthAfterStart === 0) return null;

					Log.debug("ISOFile","Getting sample #"+sampleNum+" partial data (alreadyRead: "+sample.alreadyRead+" offset: "+
						(sample.offset+sample.alreadyRead - buffer.fileStart)+" read size: "+lengthAfterStart+" full size: "+sample.size+")");

					DataStream.memcpy(sample.data.buffer, sample.alreadyRead,
					                  buffer, sample.offset+sample.alreadyRead - buffer.fileStart, lengthAfterStart);
					sample.alreadyRead += lengthAfterStart;

					/* update the number of bytes used in this buffer and check if it needs to be removed */
					buffer.usedBytes += lengthAfterStart;
					this.stream.logBufferLevel();

					/* keep looking in the next buffer */
				}
			} else {
				return null;
			}
		}
	};

	/* Release the memory used to store the data of the sample */
	ISOFile.prototype.releaseSample = function(trak, sampleNum) {	
		var sample = trak.samples[sampleNum];
		if (sample.data) {
			this.samplesDataSize -= sample.size;
			sample.data = null;
			sample.alreadyRead = 0;
			return sample.size;
		} else {
			return 0;
		}
	};

	ISOFile.prototype.getAllocatedSampleDataSize = function() {
		return this.samplesDataSize;
	};

	/* Builds the MIME Type 'codecs' sub-parameters for the whole file */
	ISOFile.prototype.getCodecs = function() {	
		var i;
		var codecs = "";
		for (i = 0; i < this.moov.traks.length; i++) {
			var trak = this.moov.traks[i];
			if (i>0) {
				codecs+=","; 
			}
			codecs += trak.mdia.minf.stbl.stsd.entries[0].getCodec();		
		}
		return codecs;
	};

	/* Helper function */
	ISOFile.prototype.getTrexById = function(id) {	
		var i;
		if (!this.moov || !this.moov.mvex) return null;
		for (i = 0; i < this.moov.mvex.trexs.length; i++) {
			var trex = this.moov.mvex.trexs[i];
			if (trex.track_id == id) return trex;
		}
		return null;
	};

	/* Helper function */
	ISOFile.prototype.getTrackById = function(id) {
		if (this.moov === undefined) {
			return null;
		}
		for (var j = 0; j < this.moov.traks.length; j++) {
			var trak = this.moov.traks[j];
			if (trak.tkhd.track_id == id) return trak;
		}
		return null;
	};
	// file:src/isofile-item-processing.js
	ISOFile.prototype.items = [];
	ISOFile.prototype.entity_groups = [];
	/* size of the buffers allocated for samples */
	ISOFile.prototype.itemsDataSize = 0;

	ISOFile.prototype.flattenItemInfo = function() {	
		var items = this.items;
		var entity_groups = this.entity_groups;
		var i, j;
		var item;
		var meta = this.meta;
		if (meta === null || meta === undefined) return;
		if (meta.hdlr === undefined) return;
		if (meta.iinf === undefined) return;
		for (i = 0; i < meta.iinf.item_infos.length; i++) {
			item = {};
			item.id = meta.iinf.item_infos[i].item_ID;
			items[item.id] = item;
			item.ref_to = [];
			item.name = meta.iinf.item_infos[i].item_name;
			if (meta.iinf.item_infos[i].protection_index > 0) {
				item.protection = meta.ipro.protections[meta.iinf.item_infos[i].protection_index-1];
			}
			if (meta.iinf.item_infos[i].item_type) {
				item.type = meta.iinf.item_infos[i].item_type;
			} else {
				item.type = "mime";
			}
			item.content_type = meta.iinf.item_infos[i].content_type;
			item.content_encoding = meta.iinf.item_infos[i].content_encoding;
		}
		if (meta.grpl) {
			for (i = 0; i < meta.grpl.boxes.length; i++) {
				entity_group = {};
				entity_group.id = meta.grpl.boxes[i].group_id;
				entity_group.entity_ids = meta.grpl.boxes[i].entity_ids;
				entity_group.type = meta.grpl.boxes[i].type;
				entity_groups[entity_group.id] = entity_group;
			}
		}
		if (meta.iloc) {
			for(i = 0; i < meta.iloc.items.length; i++) {
				var itemloc = meta.iloc.items[i];
				item = items[itemloc.item_ID];
				if (itemloc.data_reference_index !== 0) {
					Log.warn("Item storage with reference to other files: not supported");
					item.source = meta.dinf.boxes[itemloc.data_reference_index-1];
				}
				switch(itemloc.construction_method) {
					case 0: // offset into the file referenced by the data reference index
					break;
					case 1: // offset into the idat box of this meta box
					Log.warn("Item storage with construction_method : not supported");
					break;
					case 2: // offset into another item
					Log.warn("Item storage with construction_method : not supported");
					break;
				}
				item.extents = [];
				item.size = 0;
				for (j = 0; j < itemloc.extents.length; j++) {
					item.extents[j] = {};
					item.extents[j].offset = itemloc.extents[j].extent_offset + itemloc.base_offset;
					item.extents[j].length = itemloc.extents[j].extent_length;
					item.extents[j].alreadyRead = 0;
					item.size += item.extents[j].length;
				}
			}
		}
		if (meta.pitm) {
			items[meta.pitm.item_id].primary = true;
		}
		if (meta.iref) {
			for (i=0; i <meta.iref.references.length; i++) {
				var ref = meta.iref.references[i];
				for (j=0; j<ref.references.length; j++) {
					items[ref.from_item_ID].ref_to.push({type: ref.type, id: ref.references[j]});
				}
			}
		}
		if (meta.iprp) {
			for (var k = 0; k < meta.iprp.ipmas.length; k++) {
				var ipma = meta.iprp.ipmas[k];
				for (i = 0; i < ipma.associations.length; i++) {
					var association = ipma.associations[i];
					item = items[association.id];
					if (!item) {
						item = entity_groups[association.id];
					}
					if (item) {
						if (item.properties === undefined) {
							item.properties = {};
							item.properties.boxes = [];
						}
						for (j = 0; j < association.props.length; j++) {
							var propEntry = association.props[j];
							if (propEntry.property_index > 0 && propEntry.property_index-1 < meta.iprp.ipco.boxes.length) {
								var propbox = meta.iprp.ipco.boxes[propEntry.property_index-1];
								item.properties[propbox.type] = propbox;
								item.properties.boxes.push(propbox);
							}
						}
					}
				}
			}
		}
	};

	ISOFile.prototype.getItem = function(item_id) {	
		var buffer;
		var item;
		
		if (!this.meta) {
			return null;
		}

	 	item = this.items[item_id];
		if (!item.data && item.size) {
			/* Not yet fetched */
			item.data = new Uint8Array(item.size);
			item.alreadyRead = 0;
			this.itemsDataSize += item.size;
			Log.debug("ISOFile", "Allocating item #"+item_id+" of size "+item.size+" (total: "+this.itemsDataSize+")");
		} else if (item.alreadyRead === item.size) {
			/* Already fetched entirely */
			return item;
		}

		/* The item has only been partially fetched, we need to check in all buffers to find the remaining extents*/

		for (var i = 0; i < item.extents.length; i++) {
			var extent = item.extents[i];
			if (extent.alreadyRead === extent.length) {
				continue;
			} else {
				var index =	this.stream.findPosition(true, extent.offset + extent.alreadyRead, false);
				if (index > -1) {
					buffer = this.stream.buffers[index];
					var lengthAfterStart = buffer.byteLength - (extent.offset + extent.alreadyRead - buffer.fileStart);
					if (extent.length - extent.alreadyRead <= lengthAfterStart) {
						/* the (rest of the) extent is entirely contained in this buffer */

						Log.debug("ISOFile","Getting item #"+item_id+" extent #"+i+" data (alreadyRead: "+extent.alreadyRead+
							" offset: "+(extent.offset+extent.alreadyRead - buffer.fileStart)+" read size: "+(extent.length - extent.alreadyRead)+
							" full extent size: "+extent.length+" full item size: "+item.size+")");

						DataStream.memcpy(item.data.buffer, item.alreadyRead, 
						                  buffer, extent.offset+extent.alreadyRead - buffer.fileStart, extent.length - extent.alreadyRead);

						/* update the number of bytes used in this buffer and check if it needs to be removed */
						buffer.usedBytes += extent.length - extent.alreadyRead;
						this.stream.logBufferLevel();

						item.alreadyRead += (extent.length - extent.alreadyRead);
						extent.alreadyRead = extent.length;
					} else {
						/* the sample does not end in this buffer */

						Log.debug("ISOFile","Getting item #"+item_id+" extent #"+i+" partial data (alreadyRead: "+extent.alreadyRead+" offset: "+
							(extent.offset+extent.alreadyRead - buffer.fileStart)+" read size: "+lengthAfterStart+
							" full extent size: "+extent.length+" full item size: "+item.size+")");

						DataStream.memcpy(item.data.buffer, item.alreadyRead, 
						                  buffer, extent.offset+extent.alreadyRead - buffer.fileStart, lengthAfterStart);
						extent.alreadyRead += lengthAfterStart;
						item.alreadyRead += lengthAfterStart;

						/* update the number of bytes used in this buffer and check if it needs to be removed */
						buffer.usedBytes += lengthAfterStart;
						this.stream.logBufferLevel();
						return null;
					}
				} else {
					return null;
				}
			}
		}
		if (item.alreadyRead === item.size) {
			/* fetched entirely */
			return item;
		} else {
			return null;
		}
	};

	/* Release the memory used to store the data of the item */
	ISOFile.prototype.releaseItem = function(item_id) {	
		var item = this.items[item_id];
		if (item.data) {
			this.itemsDataSize -= item.size;
			item.data = null;
			item.alreadyRead = 0;
			for (var i = 0; i < item.extents.length; i++) {
				var extent = item.extents[i];
				extent.alreadyRead = 0;
			}
			return item.size;
		} else {
			return 0;
		}
	};


	ISOFile.prototype.processItems = function(callback) {
		for(var i in this.items) {
			var item = this.items[i];
			this.getItem(item.id);
			if (callback && !item.sent) {
				callback(item);
				item.sent = true;
				item.data = null;
			}
		}
	};

	ISOFile.prototype.hasItem = function(name) {
		for(var i in this.items) {
			var item = this.items[i];
			if (item.name === name) {
				return item.id;
			}
		}
		return -1;
	};

	ISOFile.prototype.getMetaHandler = function() {
		if (!this.meta) {
			return null;
		} else {
			return this.meta.hdlr.handler;		
		}
	};

	ISOFile.prototype.getPrimaryItem = function() {
		if (!this.meta || !this.meta.pitm) {
			return null;
		} else {
			return this.getItem(this.meta.pitm.item_id);
		}
	};

	ISOFile.prototype.itemToFragmentedTrackFile = function(_options) {
		var options = _options || {};
		var item = null;
		if (options.itemId) {
			item = this.getItem(options.itemId);
		} else {
			item = this.getPrimaryItem();
		}
		if (item == null) return null;

		var file = new ISOFile();
		file.discardMdatData = false;
		// assuming the track type is the same as the item type
		var trackOptions = { type: item.type, description_boxes: item.properties.boxes};
		if (item.properties.ispe) {
			trackOptions.width = item.properties.ispe.image_width;
			trackOptions.height = item.properties.ispe.image_height;
		}
		var trackId = file.addTrack(trackOptions);
		if (trackId) {
			file.addSample(trackId, item.data);
			return file;
		} else {
			return null;
		}
	};

	// file:src/isofile-write.js
	/* Rewrite the entire file */
	ISOFile.prototype.write = function(outstream) {
		for (var i=0; i<this.boxes.length; i++) {
			this.boxes[i].write(outstream);
		}
	};

	ISOFile.prototype.createFragment = function(track_id, sampleNumber, stream_) {
		var trak = this.getTrackById(track_id);
		var sample = this.getSample(trak, sampleNumber);
		if (sample == null) {
			this.setNextSeekPositionFromSample(trak.samples[sampleNumber]);
			return null;
		}
		
		var stream = stream_ || new DataStream();
		stream.endianness = DataStream.BIG_ENDIAN;

		var moof = this.createSingleSampleMoof(sample);
		moof.write(stream);

		/* adjusting the data_offset now that the moof size is known*/
		moof.trafs[0].truns[0].data_offset = moof.size+8; //8 is mdat header
		Log.debug("MP4Box", "Adjusting data_offset with new value "+moof.trafs[0].truns[0].data_offset);
		stream.adjustUint32(moof.trafs[0].truns[0].data_offset_position, moof.trafs[0].truns[0].data_offset);
			
		var mdat = new BoxParser.mdatBox();
		mdat.data = sample.data;
		mdat.write(stream);
		return stream;
	};

	/* Modify the file and create the initialization segment */
	ISOFile.writeInitializationSegment = function(ftyp, moov, total_duration, sample_duration) {
		var i;
		Log.debug("ISOFile", "Generating initialization segment");

		var stream = new DataStream();
		stream.endianness = DataStream.BIG_ENDIAN;
		ftyp.write(stream);
		
		/* we can now create the new mvex box */
		var mvex = moov.add("mvex");
		if (total_duration) {
			mvex.add("mehd").set("fragment_duration", total_duration);
		}
		for (i = 0; i < moov.traks.length; i++) {
			mvex.add("trex").set("track_id", moov.traks[i].tkhd.track_id)
							.set("default_sample_description_index", 1)
							.set("default_sample_duration", sample_duration)
							.set("default_sample_size", 0)
							.set("default_sample_flags", 1<<16);
		}
		moov.write(stream);

		return stream.buffer;

	};

	ISOFile.prototype.save = function(name) {
		var stream = new DataStream();
		stream.endianness = DataStream.BIG_ENDIAN;
		this.write(stream);
		stream.save(name);	
	};

	ISOFile.prototype.getBuffer = function() {
		var stream = new DataStream();
		stream.endianness = DataStream.BIG_ENDIAN;
		this.write(stream);
		return stream.buffer;
	};

	ISOFile.prototype.initializeSegmentation = function() {
		var i;
		var initSegs;
		var trak;
		var seg;
		if (this.onSegment === null) {
			Log.warn("MP4Box", "No segmentation callback set!");
		}
		if (!this.isFragmentationInitialized) {
			this.isFragmentationInitialized = true;		
			this.nextMoofNumber = 0;
			this.resetTables();
		}	
		initSegs = [];	
		for (i = 0; i < this.fragmentedTracks.length; i++) {
			var moov = new BoxParser.moovBox();
			moov.mvhd = this.moov.mvhd;
		    moov.boxes.push(moov.mvhd);
			trak = this.getTrackById(this.fragmentedTracks[i].id);
			moov.boxes.push(trak);
			moov.traks.push(trak);
			seg = {};
			seg.id = trak.tkhd.track_id;
			seg.user = this.fragmentedTracks[i].user;
			seg.buffer = ISOFile.writeInitializationSegment(this.ftyp, moov, (this.moov.mvex && this.moov.mvex.mehd ? this.moov.mvex.mehd.fragment_duration: undefined), (this.moov.traks[i].samples.length>0 ? this.moov.traks[i].samples[0].duration: 0));
			initSegs.push(seg);
		}
		return initSegs;
	};

	// file:src/box-print.js
	/* 
	 * Copyright (c) Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	BoxParser.Box.prototype.printHeader = function(output) {
		this.size += 8;
		if (this.size > MAX_SIZE) {
			this.size += 8;
		}
		if (this.type === "uuid") {
			this.size += 16;
		}
		output.log(output.indent+"size:"+this.size);
		output.log(output.indent+"type:"+this.type);
	};

	BoxParser.FullBox.prototype.printHeader = function(output) {
		this.size += 4;
		BoxParser.Box.prototype.printHeader.call(this, output);
		output.log(output.indent+"version:"+this.version);
		output.log(output.indent+"flags:"+this.flags);
	};

	BoxParser.Box.prototype.print = function(output) {
		this.printHeader(output);
	};

	BoxParser.ContainerBox.prototype.print = function(output) {
		this.printHeader(output);
		for (var i=0; i<this.boxes.length; i++) {
			if (this.boxes[i]) {
				var prev_indent = output.indent;
				output.indent += " ";
				this.boxes[i].print(output);
				output.indent = prev_indent;
			}
		}
	};

	ISOFile.prototype.print = function(output) {
		output.indent = "";
		for (var i=0; i<this.boxes.length; i++) {
			if (this.boxes[i]) {
				this.boxes[i].print(output);
			}
		}	
	};

	BoxParser.mvhdBox.prototype.print = function(output) {
		BoxParser.FullBox.prototype.printHeader.call(this, output);
		output.log(output.indent+"creation_time: "+this.creation_time);
		output.log(output.indent+"modification_time: "+this.modification_time);
		output.log(output.indent+"timescale: "+this.timescale);
		output.log(output.indent+"duration: "+this.duration);
		output.log(output.indent+"rate: "+this.rate);
		output.log(output.indent+"volume: "+(this.volume>>8));
		output.log(output.indent+"matrix: "+this.matrix.join(", "));
		output.log(output.indent+"next_track_id: "+this.next_track_id);
	};

	BoxParser.tkhdBox.prototype.print = function(output) {
		BoxParser.FullBox.prototype.printHeader.call(this, output);
		output.log(output.indent+"creation_time: "+this.creation_time);
		output.log(output.indent+"modification_time: "+this.modification_time);
		output.log(output.indent+"track_id: "+this.track_id);
		output.log(output.indent+"duration: "+this.duration);
		output.log(output.indent+"volume: "+(this.volume>>8));
		output.log(output.indent+"matrix: "+this.matrix.join(", "));
		output.log(output.indent+"layer: "+this.layer);
		output.log(output.indent+"alternate_group: "+this.alternate_group);
		output.log(output.indent+"width: "+this.width);
		output.log(output.indent+"height: "+this.height);
	};// file:src/mp4box.js
	/*
	 * Copyright (c) 2012-2013. Telecom ParisTech/TSI/MM/GPAC Cyril Concolato
	 * License: BSD-3-Clause (see LICENSE file)
	 */
	var MP4Box = {};

	MP4Box.createFile = function (_keepMdatData, _stream) {
		/* Boolean indicating if bytes containing media data should be kept in memory */
		var keepMdatData = (_keepMdatData !== undefined ? _keepMdatData : true);
		var file = new ISOFile(_stream);
		file.discardMdatData = (keepMdatData ? false : true);
		return file;
	};

	{
		exports$1.createFile = MP4Box.createFile;
	} 
} (mp4box_all));

const F$2 = /*@__PURE__*/getDefaultExportFromCjs(mp4box_all);

let M$1 = class M {
  /**
   * 在两个 EventTool 实例间转发消息
   * @param from
   * @param to
   * @param evtTypes 需转发的消息类型
   *
   * @example
   * EventTool.forwardEvent(from, to, ['evtName']),
   */
  static forwardEvent(t, n, r) {
    const o = r.map((s) => {
      const [i, l] = Array.isArray(s) ? s : [s, s];
      return t.on(i, (...c) => {
        n.emit(l, ...c);
      });
    });
    return () => {
      o.forEach((s) => s());
    };
  }
  #e = /* @__PURE__ */ new Map();
  /**
   * 监听 EventType 中定义的事件
   */
  on = (t, n) => {
    const r = this.#e.get(t) ?? /* @__PURE__ */ new Set();
    return r.add(n), this.#e.has(t) || this.#e.set(t, r), () => {
      r.delete(n), r.size === 0 && this.#e.delete(t);
    };
  };
  /**
   * 监听事件，首次触发后自动移除监听
   *
   * 期望回调一次的事件，使用 once; 期望多次回调使用 on
   */
  once = (t, n) => {
    const r = this.on(t, (...o) => {
      r(), n(...o);
    });
    return r;
  };
  /**
   * 触发事件
   * @param type
   * @param args
   * @returns
   */
  emit = (t, ...n) => {
    const r = this.#e.get(t);
    r?.forEach((o) => o(...n));
  };
  destroy() {
    this.#e.clear();
  }
};
const L$3 = () => {
  let e, t = 16.6;
  self.onmessage = (n) => {
    n.data.event === "start" && (self.clearInterval(e), e = self.setInterval(() => {
      self.postMessage({});
    }, t)), n.data.event === "stop" && self.clearInterval(e);
  };
}, V$3 = () => {
  const e = new Blob([`(${L$3.toString()})()`]), t = URL.createObjectURL(e);
  return new Worker(t);
}, E$1 = /* @__PURE__ */ new Map();
let B$2 = 1, z$3 = null;
globalThis.Worker != null && (z$3 = V$3(), z$3.onmessage = () => {
  B$2 += 1;
  for (const [e, t] of E$1)
    if (B$2 % e === 0) for (const n of t) n();
});
const _$1 = (e, t) => {
  const n = Math.round(t / 16.6), r = E$1.get(n) ?? /* @__PURE__ */ new Set();
  return r.add(e), E$1.set(n, r), E$1.size === 1 && r.size === 1 && z$3?.postMessage({ event: "start" }), () => {
    r.delete(e), r.size === 0 && E$1.delete(n), E$1.size === 0 && (B$2 = 0, z$3?.postMessage({ event: "stop" }));
  };
};
function Y$2(e, t) {
  let n = false;
  async function r() {
    const o = e.getReader();
    for (; !n; ) {
      const { value: s, done: i } = await o.read();
      if (i) {
        t.onDone();
        return;
      }
      await t.onChunk(s);
    }
    o.releaseLock(), await e.cancel();
  }
  return r().catch(console.error), () => {
    n = true;
  };
}
function Z$1(e, t, n) {
  let r = 0, o = 0;
  const s = e.boxes;
  let i = false;
  const l = () => {
    if (!i)
      if (s.find((g) => g.type === "moof") != null)
        i = true;
      else
        return null;
    if (o >= s.length) return null;
    const f = new F$2.DataStream();
    f.endianness = F$2.DataStream.BIG_ENDIAN;
    let m = o;
    try {
      for (; m < s.length; )
        s[m].write(f), delete s[m], m += 1;
    } catch (g) {
      const y = s[m];
      throw g instanceof Error && y != null ? Error(
        `${g.message} | deltaBuf( boxType: ${y.type}, boxSize: ${y.size}, boxDataLen: ${y.data?.length ?? -1})`
      ) : g;
    }
    return P$1(e), o = s.length, new Uint8Array(f.buffer);
  };
  let c = false, a = false, d = null;
  return {
    stream: new ReadableStream({
      start(f) {
        r = self.setInterval(() => {
          const m = l();
          m != null && !a && f.enqueue(m);
        }, t), d = (m) => {
          if (clearInterval(r), e.flush(), m != null) {
            f.error(m);
            return;
          }
          const g = l();
          g != null && !a && f.enqueue(g), a || f.close();
        }, c && d();
      },
      cancel() {
        a = true, clearInterval(r), n?.();
      }
    }),
    stop: (f) => {
      c || (c = true, d?.(f));
    }
  };
}
function P$1(e) {
  if (e.moov != null) {
    for (var t = 0; t < e.moov.traks.length; t++)
      e.moov.traks[t].samples = [];
    e.mdats = [], e.moofs = [];
  }
}
function F$1(e) {
  return e instanceof Error ? String(e) : typeof e == "object" ? JSON.stringify(e, (t, n) => n instanceof Error ? String(n) : n) : String(e);
}
function O$1() {
  const e = /* @__PURE__ */ new Date();
  return `${e.getHours()}:${e.getMinutes()}:${e.getSeconds()}.${e.getMilliseconds()}`;
}
let C$1 = 1;
const $$3 = [], U$1 = ["debug", "info", "warn", "error"].reduce(
  (e, t, n) => Object.assign(e, {
    [t]: (...r) => {
      C$1 <= n && (console[t](...r), $$3.push({
        lvName: t,
        timeStr: O$1(),
        args: r
      }));
    }
  }),
  {}
), A$2 = /* @__PURE__ */ new Map(), S$1 = {
  /**
   * 设置记录日志的级别
   *
   * @example
   * Log.setLogLevel(Log.warn) // 记录 warn，error 日志
   */
  setLogLevel: (e) => {
    C$1 = A$2.get(e) ?? 1;
  },
  ...U$1,
  /**
   * 生成一个 log 实例，所有输出前都会附加 tag
   *
   * @example
   * const log = Log.create('<prefix>')
   * log.info('xxx') // '<prefix> xxx'
   */
  create: (e) => Object.fromEntries(
    Object.entries(U$1).map(([t, n]) => [
      t,
      (...r) => n(e, ...r)
    ])
  ),
  /**
   * 将所有日志导出为一个字符串
   *
   * @example
   * Log.dump() // => [level][time]  内容...
   *
   */
  async dump() {
    return $$3.reduce(
      (e, { lvName: t, timeStr: n, args: r }) => e + `[${t}][${n}]  ${r.map((o) => F$1(o)).join(" ")}
`,
      ""
    );
  }
};
A$2.set(S$1.debug, 0);
A$2.set(S$1.info, 1);
A$2.set(S$1.warn, 2);
A$2.set(S$1.error, 3);
(async function() {
  if (await Promise.resolve(), !(globalThis.navigator == null || globalThis.document == null) && (S$1.info(
    `@webav version: 1.2.8, date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`
  ), S$1.info(globalThis.navigator.userAgent), document.addEventListener("visibilitychange", () => {
    S$1.info(`visibilitychange: ${document.visibilityState}`);
  }), "PressureObserver" in globalThis)) {
    let t = "";
    new PressureObserver((r) => {
      const o = JSON.stringify(r.map((s) => s.state));
      o !== t && (S$1.info(`cpu state change: ${o}`), t = o);
    }).observe("cpu");
  }
})();
const R$3 = (e, t) => {
  const n = new Uint8Array(8);
  new DataView(n.buffer).setUint32(0, t);
  for (let o = 0; o < 4; o++)
    n[4 + o] = e.charCodeAt(o);
  return n;
}, N$2 = () => {
  const e = new TextEncoder(), t = e.encode("mdta"), n = e.encode("mp4 handler"), r = 32 + n.byteLength + 1, o = new Uint8Array(r), s = new DataView(o.buffer);
  return o.set(R$3("hdlr", r), 0), s.setUint32(8, 0), o.set(t, 16), o.set(n, 32), o;
}, Q$2 = (e) => {
  const t = new TextEncoder(), n = t.encode("mdta"), r = e.map((a) => {
    const d = t.encode(a), h = 8 + d.byteLength, f = new Uint8Array(h);
    return new DataView(f.buffer).setUint32(0, h), f.set(n, 4), f.set(d, 4 + n.byteLength), f;
  }), s = 16 + r.reduce((a, d) => a + d.byteLength, 0), i = new Uint8Array(s), l = new DataView(i.buffer);
  i.set(R$3("keys", s), 0), l.setUint32(8, 0), l.setUint32(12, e.length);
  let c = 16;
  for (const a of r)
    i.set(a, c), c += a.byteLength;
  return i;
}, H$3 = (e) => {
  const t = new TextEncoder(), n = t.encode("data"), r = Object.entries(e).map(([c, a], d) => {
    const h = d + 1, f = t.encode(a), m = 24 + f.byteLength, g = new Uint8Array(m), y = new DataView(g.buffer);
    return y.setUint32(0, m), y.setUint32(4, h), y.setUint32(8, 16 + f.byteLength), g.set(n, 12), y.setUint32(16, 1), g.set(f, 24), g;
  }), s = 8 + r.reduce((c, a) => c + a.byteLength, 0), i = new Uint8Array(s);
  i.set(R$3("ilst", s), 0);
  let l = 8;
  for (const c of r)
    i.set(c, l), l += c.byteLength;
  return i;
}, J$2 = (e) => {
  const t = N$2(), n = Q$2(Object.keys(e)), r = H$3(e), o = t.length + n.length + r.length, s = new Uint8Array(o);
  return s.set(t, 0), s.set(n, t.length), s.set(r, t.length + n.length), s;
};
function ee$1(e) {
  S$1.info("recodemux opts:", e);
  const t = F$2.createFile(), n = new M$1(), r = (c, a) => {
    const h = c.add("udta").add("meta");
    h.data = J$2(a), h.size = h.data.byteLength;
  };
  let o = false;
  const s = () => {
    t.moov == null || o || (o = true, e.metaDataTags != null && r(t.moov, e.metaDataTags), e.duration != null && (t.moov.mvhd.duration = e.duration));
  };
  n.once("VideoReady", s), n.once("AudioReady", s);
  let i = e.video != null ? W$3(e.video, t, n) : null, l = e.audio != null ? q$1(e.audio, t, n) : null;
  return e.video == null && n.emit("VideoReady"), e.audio == null && n.emit("AudioReady"), {
    encodeVideo: (c, a) => {
      i?.encode(c, a), c.close();
    },
    encodeAudio: (c) => {
      if (l != null)
        try {
          l.encode(c), c.close();
        } catch (a) {
          const d = `encode audio chunk error: ${a.message}, state: ${JSON.stringify(
            {
              qSize: l.encodeQueueSize,
              state: l.state
            }
          )}`;
          throw S$1.error(d), Error(d);
        }
    },
    getEncodeQueueSize: () => i?.encodeQueueSize ?? l?.encodeQueueSize ?? 0,
    flush: async () => {
      await Promise.all([
        i?.flush(),
        l?.state === "configured" ? l.flush() : null
      ]);
    },
    close: () => {
      n.destroy(), i?.close(), l?.state === "configured" && l.close();
    },
    mp4file: t
  };
}
function W$3(e, t, n) {
  const r = {
    // 微秒
    timescale: 1e6,
    width: e.width,
    height: e.height,
    brands: ["isom", "iso2", "avc1", "mp42", "mp41"],
    avcDecoderConfigRecord: null,
    hevcDecoderConfigRecord: null,
    vpcDecoderConfigRecord: null,
    type: "avc1",
    name: "Track created with WebAV"
  };
  let o = -1, s = false;
  n.once("AudioReady", () => {
    s = true;
  });
  const i = {
    encoder0: [],
    encoder1: []
  }, l = (u, b, p) => {
    if (o === -1 && p != null) {
      let w = p.decoderConfig?.description;
      e.codec.startsWith("avc1") ? j$1(w) : e.codec.startsWith("vp09") && p.decoderConfig && (r.type = "vp09", w = K$2(p.decoderConfig));
      const x = [
        ["avc1", "avcDecoderConfigRecord"],
        ["hvc1", "hevcDecoderConfigRecord"],
        ["vp09", "vpcDecoderConfigRecord"]
      ].find(([D]) => e.codec.startsWith(D))?.[1];
      x != null && w != null && (r[x] = w), o = t.addTrack(r), n.emit("VideoReady"), S$1.info("VideoEncoder, video track ready, trackId:", o);
    }
    i[u].push(T$1(b));
  };
  let c = "encoder1", a = 0;
  const d = Math.floor(1e3 / e.expectFPS * 1e3);
  function h() {
    if (!s) return;
    const u = c === "encoder1" ? "encoder0" : "encoder1", b = i[c], p = i[u];
    if (b.length === 0 && p.length === 0) return;
    let w = b[0];
    if (w != null && (!w.is_sync || w.cts - a < d)) {
      const D = f(b);
      D > a && (a = D);
    }
    const x = p[0];
    if (x?.is_sync && x.cts - a < d) {
      c = u, h();
      return;
    }
    if (w?.is_sync && x?.is_sync)
      if (w.cts <= x.cts) {
        const D = f(b);
        D > a && (a = D);
      } else {
        c = u, h();
        return;
      }
  }
  function f(u) {
    let b = -1, p = 0;
    for (; p < u.length; p++) {
      const w = u[p];
      if (p > 0 && w.is_sync) break;
      t.addSample(o, w.data, w), b = w.cts + w.duration;
    }
    return u.splice(0, p), b;
  }
  const m = _$1(h, 15), g = I$3(
    e,
    (u, b) => l("encoder0", u, b)
  ), y = I$3(
    e,
    (u, b) => l("encoder1", u, b)
  );
  let v = 0;
  return {
    get encodeQueueSize() {
      return g.encodeQueueSize + y.encodeQueueSize;
    },
    encode: (u, b) => {
      try {
        b.keyFrame && (v += 1), (v % 2 === 0 ? g : y).encode(u, b);
      } catch (p) {
        const w = `encode video frame error: ${p.message}, state: ${JSON.stringify(
          {
            ts: u.timestamp,
            keyFrame: b.keyFrame,
            duration: u.duration,
            gopId: v
          }
        )}`;
        throw S$1.error(w), Error(w);
      }
    },
    flush: async () => {
      await Promise.all([
        g.state === "configured" ? await g.flush() : null,
        y.state === "configured" ? await y.flush() : null
      ]), m(), h();
    },
    close: () => {
      g.state === "configured" && g.close(), y.state === "configured" && y.close();
    }
  };
}
function j$1(e) {
  const t = new Uint8Array(e);
  t[2].toString(2).slice(-2).includes("1") && (t[2] = 0);
}
function I$3(e, t) {
  const n = {
    codec: e.codec,
    framerate: e.expectFPS,
    hardwareAcceleration: e.__unsafe_hardwareAcceleration__,
    // 码率
    bitrate: e.bitrate,
    width: e.width,
    height: e.height,
    // H264 不支持背景透明度
    alpha: "discard",
    // macos 自带播放器只支持avc
    avc: { format: "avc" }
    // mp4box.js 无法解析 annexb 的 mimeCodec ，只会显示 avc1
    // avc: { format: 'annexb' }
  }, r = new VideoEncoder({
    error: (o) => {
      const s = `VideoEncoder error: ${o.message}, config: ${JSON.stringify(n)}, state: ${JSON.stringify(
        {
          qSize: r.encodeQueueSize,
          state: r.state
        }
      )}`;
      throw S$1.error(s), Error(s);
    },
    output: t
  });
  return r.configure(n), r;
}
function q$1(e, t, n) {
  const r = {
    timescale: 1e6,
    samplerate: e.sampleRate,
    channel_count: e.channelCount,
    hdlr: "soun",
    type: e.codec === "aac" ? "mp4a" : "Opus",
    name: "Track created with WebAV"
  };
  let o = -1, s = [], i = false;
  n.once("VideoReady", () => {
    i = true, s.forEach((a) => {
      const d = T$1(a);
      t.addSample(o, d.data, d);
    }), s = [];
  });
  const l = {
    codec: e.codec === "aac" ? "mp4a.40.2" : "opus",
    sampleRate: e.sampleRate,
    numberOfChannels: e.channelCount,
    bitrate: 128e3
  }, c = new AudioEncoder({
    error: (a) => {
      const d = `AudioEncoder error: ${a.message}, config: ${JSON.stringify(
        l
      )}, state: ${JSON.stringify({
        qSize: c.encodeQueueSize,
        state: c.state
      })}`;
      throw S$1.error(d), Error(d);
    },
    output: (a, d) => {
      if (o === -1) {
        const h = d?.decoderConfig?.description;
        o = t.addTrack({
          ...r,
          description: h == null ? void 0 : G$1(h)
        }), n.emit("AudioReady"), S$1.info("AudioEncoder, audio track ready, trackId:", o);
      }
      if (i) {
        const h = T$1(a);
        t.addSample(o, h.data, h);
      } else
        s.push(a);
    }
  });
  return c.configure(l), c;
}
function G$1(e) {
  const t = e.byteLength, n = new Uint8Array([
    0,
    // version 0
    0,
    0,
    0,
    // flags
    3,
    // descriptor_type
    23 + t,
    // length
    0,
    // 0x01, // es_id
    2,
    // es_id
    0,
    // stream_priority
    4,
    // descriptor_type
    18 + t,
    // length
    64,
    // codec : mpeg4_audio
    21,
    // stream_type
    0,
    0,
    0,
    // buffer_size
    0,
    0,
    0,
    0,
    // maxBitrate
    0,
    0,
    0,
    0,
    // avgBitrate
    5,
    // descriptor_type
    t,
    ...new Uint8Array(e instanceof ArrayBuffer ? e : e.buffer),
    6,
    1,
    2
  ]), r = new F$2.BoxParser.esdsBox(n.byteLength);
  return r.hdr_size = 0, r.parse(new F$2.DataStream(n, 0, F$2.DataStream.BIG_ENDIAN)), r;
}
function T$1(e) {
  const t = new ArrayBuffer(e.byteLength);
  e.copyTo(t);
  const n = e.timestamp;
  return {
    duration: e.duration ?? 0,
    dts: n,
    cts: n,
    is_sync: e.type === "key",
    data: t
  };
}
function K$2(e) {
  const n = e.codec.split("."), r = parseInt(n[1] || "0", 10), o = parseInt(n[2] || "40", 10), s = parseInt(n[3] || "08", 10), i = {
    bt709: 1,
    bt601: 5,
    bt2020: 9
  }, l = {
    bt709: 1,
    srgb: 13,
    pq: 16,
    hlg: 18
  }, c = {
    bt709: 1,
    bt601: 5,
    bt2020: 9
  }, a = i[e.colorSpace?.primaries || "bt709"] || 1, d = l[e.colorSpace?.transfer || "bt709"] || 1, h = c[e.colorSpace?.matrix || "bt709"] || 1, f = e.colorSpace?.fullRange ? 1 : 0, m = 1, g = 0, y = new ArrayBuffer(12), v = new DataView(y);
  let u = 0;
  return v.setUint32(u, 1 << 24), u += 4, v.setUint8(u++, r), v.setUint8(u++, o), v.setUint8(
    u++,
    s << 4 | m << 1 | f
  ), v.setUint8(u++, a), v.setUint8(u++, d), v.setUint8(u++, h), v.setUint16(u, g), y;
}
function te$1(e, t) {
  let n;
  return function(...r) {
    if (n == null || performance.now() - n > t)
      return n = performance.now(), e.apply(this, r);
  };
}
function ne(e, t) {
  let n = 0;
  return function(...r) {
    n !== 0 && clearTimeout(n), n = setTimeout(() => {
      e.apply(this, r);
    }, t);
  };
}

/*
 * Copyright (c) 2019 Rafael da Silva Rocha.
 * Copyright 2012 Spencer Cohen
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview The Interpolator class. Based on Smooth.js by Spencer Cohen.
 * @see https://github.com/rochars/wave-resampler
 * @see https://github.com/osuushi/Smooth.js
 */

/**
 * A class to get scaled values out of arrays.
 */
class Interpolator {
  
  /**
   * @param {number} scaleFrom the length of the original array.
   * @param {number} scaleTo The length of the new array.
   * @param {?Object} details The extra configuration, if needed.
   */
  constructor(scaleFrom, scaleTo, details) {
    /**
     * The length of the original array.
     * @type {number}
     */
    this.length_ = scaleFrom;
    /**
     * The scaling factor.
     * @type {number}
     */
    this.scaleFactor_ = (scaleFrom - 1) / scaleTo;
    /**
     * The interpolation function.
     * @type {Function}
     */
    this.interpolate = this.cubic;
    if (details.method === 'point') {
    	this.interpolate = this.point;
    } else if(details.method === 'linear') {
    	this.interpolate = this.linear;
    } else if(details.method === 'sinc') {
    	this.interpolate = this.sinc;
    }
    /**
     * The tanget factor for cubic interpolation.
     * @type {number}
     */
    this.tangentFactor_ = 1 - Math.max(0, Math.min(1, details.tension || 0));
    // Configure the kernel for sinc
    /**
     * The sinc filter size.
     * @type {number}
     */
    this.sincFilterSize_ = details.sincFilterSize || 1;
    /**
     * The sinc kernel.
     * @type {Function}
     */
    this.kernel_ = sincKernel_(details.sincWindow || window_);
  }

  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  point(t, samples) {
    return this.getClippedInput_(Math.round(this.scaleFactor_ * t), samples);
  }

  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  linear(t, samples) {
    t = this.scaleFactor_ * t;
    let k = Math.floor(t);
    t -= k;
    return (1 - t) *
    	this.getClippedInput_(k, samples) + t *
    	this.getClippedInput_(k + 1, samples);
  }

  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  cubic(t, samples) {
    t = this.scaleFactor_ * t;
    let k = Math.floor(t);
    let m = [this.getTangent_(k, samples), this.getTangent_(k + 1, samples)];
    let p = [this.getClippedInput_(k, samples),
      this.getClippedInput_(k + 1, samples)];
    t -= k;
    let t2 = t * t;
    let t3 = t * t2;
    return (2 * t3 - 3 * t2 + 1) *
      p[0] + (t3 - 2 * t2 + t) *
      m[0] + (-2 * t3 + 3 * t2) *
      p[1] + (t3 - t2) * m[1];
  }

  /**
   * @param {number} t The index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   */
  sinc(t, samples) {
    t = this.scaleFactor_ * t;
    let k = Math.floor(t);
    let ref = k - this.sincFilterSize_ + 1;
    let ref1 = k + this.sincFilterSize_;
    let sum = 0;
    for (let n = ref; n <= ref1; n++) {
      sum += this.kernel_(t - n) * this.getClippedInput_(n, samples);
    }
    return sum;
  }

  /**
   * @param {number} k The scaled index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The tangent.
   * @private
   */
  getTangent_(k, samples) {
    return this.tangentFactor_ *
      (this.getClippedInput_(k + 1, samples) -
        this.getClippedInput_(k - 1, samples)) / 2;
  }

  /**
   * @param {number} t The scaled index to interpolate.
   * @param {Array|TypedArray} samples the original array.
   * @return {number} The interpolated value.
   * @private
   */
  getClippedInput_(t, samples) {
    if ((0 <= t && t < this.length_)) {
      return samples[t];
    }
    return 0;
  }
}

// Sinc functions

/**
 * The default window function.
 * @param {number} x The sinc signal.
 * @return {number}
 * @private
 */
function window_(x) {
  return Math.exp(-x / 2 * x / 2);
}

/**
 * @param {Function} window The window function.
 * @return {Function}
 * @private
 */
function sincKernel_(window) {
  return function(x) { return sinc_(x) * window(x); };
}

/**
 * @param {number} x The sinc signal.
 * @return {number}
 * @private
 */
function sinc_(x) {
  if (x === 0) {
    return 1;
  }
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

/*
 * Copyright (c) 2019 Rafael da Silva Rocha.
 * Copyright (c) 2014 Florian Markert
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview FIR LPF. Based on the FIR LPF from Fili by Florian Markert.
 * @see https://github.com/rochars/wave-resampler
 * @see https://github.com/markert/fili.js
 */

/**
 * A FIR low pass filter.
 */
class FIRLPF {
  
  /**
   * @param {number} order The order of the filter.
   * @param {number} sampleRate The sample rate.
   * @param {number} cutOff The cut off frequency.
   */
  constructor(order, sampleRate, cutOff) {
    let omega = 2 * Math.PI * cutOff / sampleRate;
    let dc = 0;
    this.filters = [];
    for (let i = 0; i <= order; i++) {
      if (i - order / 2 === 0) {
        this.filters[i] = omega;
      } else {
        this.filters[i] = Math.sin(omega * (i - order / 2)) / (i - order / 2);
        // Hamming window
        this.filters[i] *= (0.54 - 0.46 * Math.cos(2 * Math.PI * i / order));
      }
      dc = dc + this.filters[i];
    }
    // normalize
    for (let i = 0; i <= order; i++) {
      this.filters[i] /= dc;
    }
    this.z = this.initZ_();
  }

  /**
   * @param {number} sample A sample of a sequence.
   * @return {number}
   */
  filter(sample) {
    this.z.buf[this.z.pointer] = sample;
    let out = 0;
    for (let i = 0, len = this.z.buf.length; i < len; i++) {
      out += (
        this.filters[i] * this.z.buf[(this.z.pointer + i) % this.z.buf.length]);
    }
    this.z.pointer = (this.z.pointer + 1) % (this.z.buf.length);
    return out;
  }

  /**
   * Reset the filter.
   */
  reset() {
    this.z = this.initZ_();
  }

  /**
   * Return the default value for z.
   * @private
   */
  initZ_() {
    let r = [];
    for (let i = 0; i < this.filters.length - 1; i++) {
      r.push(0);
    }
    return {
      buf: r,
      pointer: 0
    };
  }
}

/*
 * Copyright (c) 2019 Rafael da Silva Rocha.
 * Copyright (c) 2014 Florian Markert
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview Butterworth LPF. Based on the Butterworth LPF from Fili.js.
 * @see https://github.com/rochars/wave-resampler
 * @see https://github.com/markert/fili.js
 */

/**
 * Butterworth LPF.
 */
class ButterworthLPF {
  
  /**
   * @param {number} order The order of the filter.
   * @param {number} sampleRate The sample rate.
   * @param {number} cutOff The cut off frequency.
   */
  constructor(order, sampleRate, cutOff) {
    let filters = [];
    for (let i = 0; i < order; i++) {
      filters.push(this.getCoeffs_({
        Fs: sampleRate,
        Fc: cutOff,
        Q: 0.5 / (Math.sin((Math.PI / (order * 2)) * (i + 0.5)))
      }));
    }
    this.stages = [];
    for (let i = 0; i < filters.length; i++) {
      this.stages[i] = {
        b0 : filters[i].b[0],
        b1 : filters[i].b[1],
        b2 : filters[i].b[2],
        a1 : filters[i].a[0],
        a2 : filters[i].a[1],
        k : filters[i].k,
        z : [0, 0]
      };
    }
  }

  /**
   * @param {number} sample A sample of a sequence.
   * @return {number}
   */
  filter(sample) {
    let out = sample;
    for (let i = 0, len = this.stages.length; i < len; i++) {
      out = this.runStage_(i, out);
    }
    return out;
  }

  getCoeffs_(params) {
    let coeffs = {};
    coeffs.z = [0, 0];
    coeffs.a = [];
    coeffs.b = [];
    let p = this.preCalc_(params, coeffs);
    coeffs.k = 1;
    coeffs.b.push((1 - p.cw) / (2 * p.a0));
    coeffs.b.push(2 * coeffs.b[0]);
    coeffs.b.push(coeffs.b[0]);
    return coeffs;
  }

  preCalc_(params, coeffs) {
    let pre = {};
    let w = 2 * Math.PI * params.Fc / params.Fs;
    pre.alpha = Math.sin(w) / (2 * params.Q);
    pre.cw = Math.cos(w);
    pre.a0 = 1 + pre.alpha;
    coeffs.a0 = pre.a0;
    coeffs.a.push((-2 * pre.cw) / pre.a0);
    coeffs.k = 1;
    coeffs.a.push((1 - pre.alpha) / pre.a0);
    return pre;
  }
  
  runStage_(i, input) {
    let temp =
      input * this.stages[i].k - this.stages[i].a1 * this.stages[i].z[0] -
      this.stages[i].a2 * this.stages[i].z[1];
    let out =
      this.stages[i].b0 * temp + this.stages[i].b1 * this.stages[i].z[0] +
      this.stages[i].b2 * this.stages[i].z[1];
    this.stages[i].z[1] = this.stages[i].z[0];
    this.stages[i].z[0] = temp;
    return out;
  }

  /**
   * Reset the filter.
   */
  reset() {
    for (let i = 0; i < this.stages.length; i++) {
      this.stages[i].z = [0, 0];
    }
  }
}

/*
 * Copyright (c) 2019 Rafael da Silva Rocha.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */


/**
 * Configures wich resampling method uses LPF by default.
 * @private
 */
const DEFAULT_LPF_USE = {
  'point': false,
  'linear': false,
  'cubic': true,
  'sinc': true
};

/**
 * The default orders for the LPF types.
 * @private
 */
const DEFAULT_LPF_ORDER = {
  'IIR': 16,
  'FIR': 71
};

/**
 * The classes to use with each LPF type.
 * @private
 */
const DEFAULT_LPF = {
  'IIR': ButterworthLPF,
  'FIR': FIRLPF
};

/**
 * Change the sample rate of the samples to a new sample rate.
 * @param {!Array|!TypedArray} samples The original samples.
 * @param {number} oldSampleRate The original sample rate.
 * @param {number} sampleRate The target sample rate.
 * @param {?Object} details The extra configuration, if needed.
 * @return {!Float64Array} the new samples.
 */
function resample(samples, oldSampleRate, sampleRate, details={}) {  
  // Make the new sample container
  let rate = ((sampleRate - oldSampleRate) / oldSampleRate) + 1;
  let newSamples = new Float64Array(samples.length * (rate));
  // Create the interpolator
  details.method = details.method || 'cubic';
  let interpolator = new Interpolator(
    samples.length,
    newSamples.length,
    {
      method: details.method,
      tension: details.tension || 0,
      sincFilterSize: details.sincFilterSize || 6,
      sincWindow: details.sincWindow || undefined
    });
  // Resample + LPF
  if (details.LPF === undefined) {
    details.LPF = DEFAULT_LPF_USE[details.method];
  } 
  if (details.LPF) {
    details.LPFType = details.LPFType || 'IIR';
    const LPF = DEFAULT_LPF[details.LPFType];
    // Upsampling
    if (sampleRate > oldSampleRate) {
      let filter = new LPF(
        details.LPFOrder || DEFAULT_LPF_ORDER[details.LPFType],
        sampleRate,
        (oldSampleRate / 2));
      upsample_(
        samples, newSamples, interpolator, filter);
    // Downsampling
    } else {
      let filter = new LPF(
        details.LPFOrder || DEFAULT_LPF_ORDER[details.LPFType],
        oldSampleRate,
        sampleRate / 2);
      downsample_(
        samples, newSamples, interpolator, filter);
    }
  // Resample, no LPF
  } else {
    resample_(samples, newSamples, interpolator);
  }
  return newSamples;
}

/**
 * Resample.
 * @param {!Array|!TypedArray} samples The original samples.
 * @param {!Float64Array} newSamples The container for the new samples.
 * @param {Object} interpolator The interpolator.
 * @private
 */
function resample_(samples, newSamples, interpolator) {
  // Resample
  for (let i = 0, len = newSamples.length; i < len; i++) {
    newSamples[i] = interpolator.interpolate(i, samples);
  }
}

/**
 * Upsample with LPF.
 * @param {!Array|!TypedArray} samples The original samples.
 * @param {!Float64Array} newSamples The container for the new samples.
 * @param {Object} interpolator The interpolator.
 * @param {Object} filter The LPF object.
 * @private
 */
function upsample_(samples, newSamples, interpolator, filter) {
  // Resample and filter
  for (let i = 0, len = newSamples.length; i < len; i++) {
    newSamples[i] = filter.filter(interpolator.interpolate(i, samples));
  }
  // Reverse filter
  filter.reset();
  for (let i = newSamples.length - 1; i >= 0; i--) {
    newSamples[i]  = filter.filter(newSamples[i]);
  }
}

/**
 * Downsample with LPF.
 * @param {!Array|!TypedArray} samples The original samples.
 * @param {!Float64Array} newSamples The container for the new samples.
 * @param {Object} interpolator The interpolator.
 * @param {Object} filter The LPF object.
 * @private
 */
function downsample_(samples, newSamples, interpolator, filter) {
  // Filter
  for (let i = 0, len = samples.length; i < len; i++) {
    samples[i]  = filter.filter(samples[i]);
  }
  // Reverse filter
  filter.reset();
  for (let i = samples.length - 1; i >= 0; i--) {
    samples[i]  = filter.filter(samples[i]);
  }
  // Resample
  resample_(samples, newSamples, interpolator);
}

var z$2 = (r) => {
  throw TypeError(r);
};
var j = (r, e, t) => e.has(r) || z$2("Cannot " + t);
var n = (r, e, t) => (j(r, e, "read from private field"), t ? t.call(r) : e.get(r)), o = (r, e, t) => e.has(r) ? z$2("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(r) : e.set(r, t), l = (r, e, t, a) => (j(r, e, "write to private field"), e.set(r, t), t);
const J$1 = "KGZ1bmN0aW9uKCl7InVzZSBzdHJpY3QiO2Z1bmN0aW9uIHUobil7aWYobj09PSIvIilyZXR1cm57cGFyZW50Om51bGwsbmFtZToiIn07Y29uc3QgZT1uLnNwbGl0KCIvIikuZmlsdGVyKGk9PmkubGVuZ3RoPjApO2lmKGUubGVuZ3RoPT09MCl0aHJvdyBFcnJvcigiSW52YWxpZCBwYXRoIik7Y29uc3QgYT1lW2UubGVuZ3RoLTFdLHI9Ii8iK2Uuc2xpY2UoMCwtMSkuam9pbigiLyIpO3JldHVybntuYW1lOmEscGFyZW50OnJ9fWFzeW5jIGZ1bmN0aW9uIHcobixlKXtjb25zdHtwYXJlbnQ6YSxuYW1lOnJ9PXUobik7aWYoYT09bnVsbClyZXR1cm4gYXdhaXQgbmF2aWdhdG9yLnN0b3JhZ2UuZ2V0RGlyZWN0b3J5KCk7Y29uc3QgaT1hLnNwbGl0KCIvIikuZmlsdGVyKHQ9PnQubGVuZ3RoPjApO3RyeXtsZXQgdD1hd2FpdCBuYXZpZ2F0b3Iuc3RvcmFnZS5nZXREaXJlY3RvcnkoKTtmb3IoY29uc3QgcyBvZiBpKXQ9YXdhaXQgdC5nZXREaXJlY3RvcnlIYW5kbGUocyx7Y3JlYXRlOmUuY3JlYXRlfSk7aWYoZS5pc0ZpbGUpcmV0dXJuIGF3YWl0IHQuZ2V0RmlsZUhhbmRsZShyLHtjcmVhdGU6ZS5jcmVhdGV9KX1jYXRjaCh0KXtpZih0Lm5hbWU9PT0iTm90Rm91bmRFcnJvciIpcmV0dXJuIG51bGw7dGhyb3cgdH19Y29uc3QgZj17fTtzZWxmLm9ubWVzc2FnZT1hc3luYyBuPT57dmFyIGk7Y29uc3R7ZXZ0VHlwZTplLGFyZ3M6YX09bi5kYXRhO2xldCByPWZbYS5maWxlSWRdO3RyeXtsZXQgdDtjb25zdCBzPVtdO2lmKGU9PT0icmVnaXN0ZXIiKXtjb25zdCBsPWF3YWl0IHcoYS5maWxlUGF0aCx7Y3JlYXRlOiEwLGlzRmlsZTohMH0pO2lmKGw9PW51bGwpdGhyb3cgRXJyb3IoYG5vdCBmb3VuZCBmaWxlOiAke2EuZmlsZUlkfWApO3I9YXdhaXQgbC5jcmVhdGVTeW5jQWNjZXNzSGFuZGxlKHttb2RlOmEubW9kZX0pLGZbYS5maWxlSWRdPXJ9ZWxzZSBpZihlPT09ImNsb3NlIilhd2FpdCByLmNsb3NlKCksZGVsZXRlIGZbYS5maWxlSWRdO2Vsc2UgaWYoZT09PSJ0cnVuY2F0ZSIpYXdhaXQgci50cnVuY2F0ZShhLm5ld1NpemUpO2Vsc2UgaWYoZT09PSJ3cml0ZSIpe2NvbnN0e2RhdGE6bCxvcHRzOm99PW4uZGF0YS5hcmdzO3Q9YXdhaXQgci53cml0ZShsLG8pfWVsc2UgaWYoZT09PSJyZWFkIil7Y29uc3R7b2Zmc2V0Omwsc2l6ZTpvfT1uLmRhdGEuYXJncyxnPW5ldyBVaW50OEFycmF5KG8pLGQ9YXdhaXQgci5yZWFkKGcse2F0Omx9KSxjPWcuYnVmZmVyO3Q9ZD09PW8/YzooKGk9Yy50cmFuc2Zlcik9PW51bGw/dm9pZCAwOmkuY2FsbChjLGQpKT8/Yy5zbGljZSgwLGQpLHMucHVzaCh0KX1lbHNlIGU9PT0iZ2V0U2l6ZSI/dD1hd2FpdCByLmdldFNpemUoKTplPT09ImZsdXNoIiYmYXdhaXQgci5mbHVzaCgpO3NlbGYucG9zdE1lc3NhZ2Uoe2V2dFR5cGU6ImNhbGxiYWNrIixjYklkOm4uZGF0YS5jYklkLHJldHVyblZhbDp0fSxzKX1jYXRjaCh0KXtjb25zdCBzPXQ7c2VsZi5wb3N0TWVzc2FnZSh7ZXZ0VHlwZToidGhyb3dFcnJvciIsY2JJZDpuLmRhdGEuY2JJZCxlcnJNc2c6cy5uYW1lKyI6ICIrcy5tZXNzYWdlK2AKYCtKU09OLnN0cmluZ2lmeShuLmRhdGEpfSl9fX0pKCk7Ci8vIyBzb3VyY2VNYXBwaW5nVVJMPW9wZnMtd29ya2VyLUY0UldscWNfLmpzLm1hcAo=", D = (r) => Uint8Array.from(atob(r), (e) => e.charCodeAt(0)), K$1 = typeof self < "u" && self.Blob && new Blob([D(J$1)], { type: "text/javascript;charset=utf-8" });
function M(r) {
  let e;
  try {
    if (e = K$1 && (self.URL || self.webkitURL).createObjectURL(K$1), !e) throw "";
    const t = new Worker(e, {
      name: r == null ? void 0 : r.name
    });
    return t.addEventListener("error", () => {
      (self.URL || self.webkitURL).revokeObjectURL(e);
    }), t;
  } catch {
    return new Worker(
      "data:text/javascript;base64," + J$1,
      {
        name: r == null ? void 0 : r.name
      }
    );
  } finally {
    e && (self.URL || self.webkitURL).revokeObjectURL(e);
  }
}
async function _(r, e, t) {
  const a = A$1();
  return await a("register", { fileId: r, filePath: e, mode: t }), {
    read: async (i, s) => await a("read", {
      fileId: r,
      offset: i,
      size: s
    }),
    write: async (i, s) => await a(
      "write",
      {
        fileId: r,
        data: i,
        opts: s
      },
      [ArrayBuffer.isView(i) ? i.buffer : i]
    ),
    close: async () => await a("close", {
      fileId: r
    }),
    truncate: async (i) => await a("truncate", {
      fileId: r,
      newSize: i
    }),
    getSize: async () => await a("getSize", {
      fileId: r
    }),
    flush: async () => await a("flush", {
      fileId: r
    })
  };
}
const v = [];
let x$1 = 0;
function A$1() {
  if (v.length < 3) {
    const e = r();
    return v.push(e), e;
  } else {
    const e = v[x$1];
    return x$1 = (x$1 + 1) % v.length, e;
  }
  function r() {
    const e = new M();
    let t = 0, a = {};
    return e.onmessage = ({
      data: i
    }) => {
      var s, c;
      i.evtType === "callback" ? (s = a[i.cbId]) == null || s.resolve(i.returnVal) : i.evtType === "throwError" && ((c = a[i.cbId]) == null || c.reject(Error(i.errMsg))), delete a[i.cbId];
    }, async function(s, c, h = []) {
      t += 1;
      const w = new Promise((b, k) => {
        a[t] = { resolve: b, reject: k };
      });
      return e.postMessage(
        {
          cbId: t,
          evtType: s,
          args: c
        },
        h
      ), w;
    };
  }
}
function V$2(r) {
  if (r === "/") return { parent: null, name: "" };
  const e = r.split("/").filter((i) => i.length > 0);
  if (e.length === 0) throw Error("Invalid path");
  const t = e[e.length - 1], a = "/" + e.slice(0, -1).join("/");
  return { name: t, parent: a };
}
async function m(r, e) {
  const { parent: t, name: a } = V$2(r);
  if (t == null) return await navigator.storage.getDirectory();
  const i = t.split("/").filter((s) => s.length > 0);
  try {
    let s = await navigator.storage.getDirectory();
    for (const c of i)
      s = await s.getDirectoryHandle(c, {
        create: e.create
      });
    return e.isFile ? await s.getFileHandle(a, {
      create: e.create
    }) : await s.getDirectoryHandle(a, {
      create: e.create
    });
  } catch (s) {
    if (s.name === "NotFoundError")
      return null;
    throw s;
  }
}
async function L$2(r) {
  const { parent: e, name: t } = V$2(r);
  if (e == null) {
    const i = await navigator.storage.getDirectory();
    for await (const s of i.keys())
      await i.removeEntry(s, { recursive: true });
    return;
  }
  const a = await m(e, {
    create: false,
    isFile: false
  });
  if (a != null)
    try {
      await a.removeEntry(t, { recursive: !0 });
    } catch (i) {
      if (i.name === "NotFoundError") return;
      throw i;
    }
}
function E(r, e) {
  return `${r}/${e}`.replace("//", "/");
}
function g(r) {
  return new T(r);
}
var f, S, p;
const C = class C {
  constructor(e) {
    o(this, f);
    o(this, S);
    o(this, p);
    l(this, f, e);
    const { parent: t, name: a } = V$2(e);
    l(this, S, a), l(this, p, t);
  }
  get kind() {
    return "dir";
  }
  get name() {
    return n(this, S);
  }
  get path() {
    return n(this, f);
  }
  get parent() {
    return n(this, p) == null ? null : g(n(this, p));
  }
  /**
   * Creates the directory.
   * return A promise that resolves when the directory is created.
   */
  async create() {
    return await m(n(this, f), {
      create: true,
      isFile: false
    }), g(n(this, f));
  }
  /**
   * Checks if the directory exists.
   * return A promise that resolves to true if the directory exists, otherwise false.
   */
  async exists() {
    return await m(n(this, f), {
      create: false,
      isFile: false
    }) instanceof FileSystemDirectoryHandle;
  }
  /**
   * Removes the directory.
   * return A promise that resolves when the directory is removed.
   */
  async remove(e = {}) {
    for (const t of await this.children())
      try {
        await t.remove(e);
      } catch (a) {
        console.warn(a);
      }
    try {
      await L$2(n(this, f));
    } catch (t) {
      console.warn(t);
    }
  }
  /**
   * Retrieves the children of the directory.
   * return A promise that resolves to an array of objects representing the children.
   */
  async children() {
    const e = await m(n(this, f), {
      create: false,
      isFile: false
    });
    if (e == null) return [];
    const t = [];
    for await (const a of e.values())
      t.push((a.kind === "file" ? F : g)(E(n(this, f), a.name)));
    return t;
  }
  async copyTo(e) {
    if (!await this.exists())
      throw Error(`dir ${this.path} not exists`);
    if (e instanceof C) {
      const t = await e.exists() ? g(E(e.path, this.name)) : e;
      return await t.create(), await Promise.all((await this.children()).map((a) => a.copyTo(t))), t;
    } else if (e instanceof FileSystemDirectoryHandle)
      return await Promise.all(
        (await this.children()).map(async (t) => {
          t.kind === "file" ? await t.copyTo(
            await e.getFileHandle(t.name, { create: true })
          ) : await t.copyTo(
            await e.getDirectoryHandle(t.name, { create: true })
          );
        })
      ), null;
    throw Error("Illegal target type");
  }
  /**
   * move directory, copy then remove current
   */
  async moveTo(e) {
    const t = await this.copyTo(e);
    return await this.remove(), t;
  }
};
f = new WeakMap(), S = new WeakMap(), p = new WeakMap();
let T = C;
const P = /* @__PURE__ */ new Map();
function F(r, e = "rw") {
  if (e === "rw") {
    const t = P.get(r) ?? new W$2(r, e);
    return P.set(r, t), t;
  }
  return new W$2(r, e);
}
async function B$1(r, e, t = { overwrite: true }) {
  if (e instanceof W$2) {
    await B$1(r, await e.stream(), t);
    return;
  }
  const a = await (r instanceof W$2 ? r : F(r, "rw")).createWriter();
  try {
    if (t.overwrite && await a.truncate(0), e instanceof ReadableStream) {
      const i = e.getReader();
      for (; ; ) {
        const { done: s, value: c } = await i.read();
        if (s) break;
        await a.write(c);
      }
    } else
      await a.write(e);
  } catch (i) {
    throw i;
  } finally {
    await a.close();
  }
}
let $$2 = 0;
const q = () => ++$$2;
var u, Z, G, Y$1, X$1, d, R$2, I$2, y;
const O = class O {
  constructor(e, t) {
    o(this, u);
    o(this, Z);
    o(this, G);
    o(this, Y$1);
    o(this, X$1);
    o(this, d, 0);
    o(this, R$2, async () => {
    });
    o(this, I$2, /* @__PURE__ */ (() => {
      let e = null;
      return () => (l(this, d, n(this, d) + 1), e != null || (e = new Promise(async (t, a) => {
        try {
          const i = await _(
            n(this, X$1),
            n(this, u),
            n(this, Y$1)
          );
          l(this, R$2, async () => {
            e != null && (e = null, l(this, d, 0), await i.close().catch(console.error));
          }), t([
            i,
            async () => {
              l(this, d, n(this, d) - 1), !(n(this, d) > 0) && (e = null, await i.close());
            }
          ]);
        } catch (i) {
          a(i);
        }
      })), e);
    })());
    o(this, y, false);
    l(this, X$1, q()), l(this, u, e), l(this, Y$1, {
      r: "read-only",
      rw: "readwrite",
      "rw-unsafe": "readwrite-unsafe"
    }[t]);
    const { parent: a, name: i } = V$2(e);
    if (a == null) throw Error("Invalid path");
    l(this, G, i), l(this, Z, a);
  }
  get kind() {
    return "file";
  }
  get path() {
    return n(this, u);
  }
  get name() {
    return n(this, G);
  }
  get parent() {
    return n(this, Z) == null ? null : g(n(this, Z));
  }
  /**
   * Random write to file
   */
  async createWriter() {
    if (n(this, Y$1) === "read-only") throw Error("file is read-only");
    if (n(this, y)) throw Error("Other writer have not been closed");
    l(this, y, true);
    try {
      const e = new TextEncoder(), [t, a] = await n(this, I$2).call(this);
      let i = await t.getSize(), s = !1;
      return {
        write: async (c, h = {}) => {
          if (s) throw Error("Writer is closed");
          const w = typeof c == "string" ? e.encode(c) : c, b = h.at ?? i, k = w.byteLength;
          return i = b + k, await t.write(w, { at: b });
        },
        truncate: async (c) => {
          if (s) throw Error("Writer is closed");
          await t.truncate(c), i > c && (i = c);
        },
        flush: async () => {
          if (s) throw Error("Writer is closed");
          await t.flush();
        },
        close: async () => {
          if (s) throw Error("Writer is closed");
          s = !0, l(this, y, !1), await a();
        }
      };
    } catch (e) {
      throw l(this, y, false), e;
    }
  }
  /**
   * Random access to file
   */
  async createReader() {
    const [e, t] = await n(this, I$2).call(this);
    let a = false, i = 0;
    return {
      read: async (s, c = {}) => {
        if (a) throw Error("Reader is closed");
        const h = c.at ?? i, w = await e.read(h, s);
        return i = h + w.byteLength, w;
      },
      getSize: async () => {
        if (a) throw Error("Reader is closed");
        return await e.getSize();
      },
      close: async () => {
        a || (a = true, await t());
      }
    };
  }
  async text() {
    return new TextDecoder().decode(await this.arrayBuffer());
  }
  async arrayBuffer() {
    const e = await m(n(this, u), { create: false, isFile: true });
    return e == null ? new ArrayBuffer(0) : (await e.getFile()).arrayBuffer();
  }
  async stream() {
    const e = await this.getOriginFile();
    return e == null ? new ReadableStream({
      pull: (t) => {
        t.close();
      }
    }) : e.stream();
  }
  async getOriginFile() {
    var e;
    return (e = await m(n(this, u), { create: false, isFile: true })) == null ? void 0 : e.getFile();
  }
  async getSize() {
    const e = await m(n(this, u), { create: false, isFile: true });
    return e == null ? 0 : (await e.getFile()).size;
  }
  async exists() {
    return await m(n(this, u), {
      create: false,
      isFile: true
    }) instanceof FileSystemFileHandle;
  }
  async remove(e = {}) {
    if (e.force === true) {
      await n(this, R$2).call(this), await L$2(n(this, u)), P.delete(n(this, u));
      return;
    }
    if (n(this, d) > 0) throw Error("exists unclosed reader/writer");
    await L$2(n(this, u));
  }
  async copyTo(e) {
    if (e instanceof O)
      return e.path === this.path ? this : (await B$1(e, this), e);
    if (e instanceof T) {
      if (!await this.exists())
        throw Error(`file ${this.path} not exists`);
      return await this.copyTo(F(E(e.path, this.name)));
    } else if (e instanceof FileSystemFileHandle)
      return await (await this.stream()).pipeTo(await e.createWritable()), null;
    throw Error("Illegal target type");
  }
  /**
   * move file, copy then remove current
   */
  async moveTo(e) {
    const t = await this.copyTo(e);
    return await this.remove(), t;
  }
};
u = new WeakMap(), Z = new WeakMap(), G = new WeakMap(), Y$1 = new WeakMap(), X$1 = new WeakMap(), d = new WeakMap(), R$2 = new WeakMap(), I$2 = new WeakMap(), y = new WeakMap();
let W$2 = O;
const U = "/.opfs-tools-temp-dir";
async function Q$1(r) {
  try {
    if (r.kind === "file") {
      if (!await r.exists()) return !0;
      const e = await r.createWriter();
      await e.truncate(0), await e.close(), await r.remove();
    } else
      await r.remove();
    return !0;
  } catch (e) {
    return console.warn(e), false;
  }
}
function ee() {
  setInterval(async () => {
    for (const e of await g(U).children()) {
      const t = /^\d+-(\d+)$/.exec(e.name);
      (t == null || Date.now() - Number(t[1]) > 2592e5) && await Q$1(e);
    }
  }, 60 * 1e3);
}
const H$2 = [];
let N$1 = false;
async function te() {
  if (globalThis.localStorage == null) return;
  const r = "OPFS_TOOLS_EXPIRES_TMP_FILES";
  N$1 || (N$1 = true, globalThis.addEventListener("unload", () => {
    H$2.length !== 0 && localStorage.setItem(
      r,
      `${localStorage.getItem(r) ?? ""},${H$2.join(",")}`
    );
  }));
  let e = localStorage.getItem(r) ?? "";
  for (const t of e.split(","))
    t.length !== 0 && await Q$1(F(`${U}/${t}`)) && (e = e.replace(t, ""));
  localStorage.setItem(r, e.replace(/,{2,}/g, ","));
}
(async function() {
  var e;
  globalThis.__opfs_tools_tmpfile_init__ !== true && (globalThis.__opfs_tools_tmpfile_init__ = true, !(globalThis.FileSystemDirectoryHandle == null || globalThis.FileSystemFileHandle == null || ((e = globalThis.navigator) == null ? void 0 : e.storage.getDirectory) == null) && (ee(), await te()));
})();
function ae() {
  const r = `${Math.random().toString().slice(2)}-${Date.now()}`;
  return H$2.push(r), F(`${U}/${r}`);
}

function At(s) {
  return document.createElement(s);
}
function Ft(s) {
  var t = "", e = new Uint8Array(s), i = e.byteLength;
  for (let n = 0; n < i; n++)
    t += String.fromCharCode(e[n]);
  return window.btoa(t);
}
async function kt(s, t, e = {}) {
  const i = At("pre");
  i.style.cssText = `margin: 0; ${t}; position: fixed;`, i.textContent = s, document.body.appendChild(i), e.onCreated?.(i);
  const n = "TMP_FONT_NAME_" + crypto.randomUUID();
  let a = null;
  e.font != null && (i.style.fontFamily = n, a = new FontFace(n, `url(${e.font.url})`), await a.load(), document.fonts.add(a), await document.fonts.ready);
  const { width: r, height: o } = i.getBoundingClientRect();
  i.remove(), a != null && document.fonts.delete(a);
  const c = new Image();
  c.width = r, c.height = o;
  const l = e.font == null ? "" : `
    @font-face {
      font-family: '${n}';
      src: url('data:font/woff2;base64,${Ft(await (await fetch(e.font.url)).arrayBuffer())}') format('woff2');
    }
  `, h = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${o}">
      <style>
        ${l}
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${i.outerHTML}</div>
      </foreignObject>
    </svg>
  `.replace(/\t/g, "").replace(/#/g, "%23");
  return c.src = `data:image/svg+xml;charset=utf-8,${h}`, await new Promise((u) => {
    c.onload = u;
  }), c;
}
async function ye(s, t, e = {}) {
  const i = await kt(s, t, e), n = new OffscreenCanvas(i.width, i.height);
  return n.getContext("2d")?.drawImage(i, 0, 0, i.width, i.height), await createImageBitmap(n);
}
function It(s) {
  const t = new Float32Array(
    s.map((i) => i.length).reduce((i, n) => i + n)
  );
  let e = 0;
  for (const i of s)
    t.set(i, e), e += i.length;
  return t;
}
function tt$1(s) {
  const t = [];
  for (let e = 0; e < s.length; e += 1)
    for (let i = 0; i < s[e].length; i += 1)
      t[i] == null && (t[i] = []), t[i].push(s[e][i]);
  return t.map(It);
}
function et$1(s) {
  if (s.format === "f32-planar") {
    const t = [];
    for (let e = 0; e < s.numberOfChannels; e += 1) {
      const i = s.allocationSize({ planeIndex: e }), n = new ArrayBuffer(i);
      s.copyTo(n, { planeIndex: e }), t.push(new Float32Array(n));
    }
    return t;
  } else if (s.format === "f32") {
    const t = new ArrayBuffer(s.allocationSize({ planeIndex: 0 }));
    return s.copyTo(t, { planeIndex: 0 }), Et(new Float32Array(t), s.numberOfChannels);
  } else if (s.format === "s16") {
    const t = new ArrayBuffer(s.allocationSize({ planeIndex: 0 }));
    return s.copyTo(t, { planeIndex: 0 }), Rt(new Int16Array(t), s.numberOfChannels);
  }
  throw Error("Unsupported audio data format");
}
function Rt(s, t) {
  const e = s.length / t, i = Array.from(
    { length: t },
    () => new Float32Array(e)
  );
  for (let n = 0; n < e; n++)
    for (let a = 0; a < t; a++) {
      const r = s[n * t + a];
      i[a][n] = r / 32768;
    }
  return i;
}
function Et(s, t) {
  const e = s.length / t, i = Array.from(
    { length: t },
    () => new Float32Array(e)
  );
  for (let n = 0; n < e; n++)
    for (let a = 0; a < t; a++)
      i[a][n] = s[n * t + a];
  return i;
}
function $$1(s) {
  return Array(s.numberOfChannels).fill(0).map((t, e) => s.getChannelData(e));
}
async function Dt(s, t) {
  const e = {
    type: t,
    data: s
  }, i = new ImageDecoder(e);
  await Promise.all([i.completed, i.tracks.ready]);
  let n = i.tracks.selectedTrack?.frameCount ?? 1;
  const a = [];
  for (let r = 0; r < n; r += 1)
    a.push((await i.decode({ frameIndex: r })).image);
  return a;
}
async function Pt(s, t, e) {
  const i = s.length, n = Array(e.chanCount).fill(0).map(() => new Float32Array(0));
  if (i === 0) return n;
  const a = Math.max(...s.map((l) => l.length));
  if (a === 0) return n;
  if (globalThis.OfflineAudioContext == null)
    return s.map(
      (l) => new Float32Array(
        resample(l, t, e.rate, {
          method: "sinc",
          LPF: false
        })
      )
    );
  const r = new globalThis.OfflineAudioContext(
    e.chanCount,
    a * e.rate / t,
    e.rate
  ), o = r.createBufferSource(), c = r.createBuffer(i, a, t);
  return s.forEach((l, h) => c.copyToChannel(l, h)), o.buffer = c, o.connect(r.destination), o.start(), $$1(await r.startRendering());
}
function H$1(s) {
  return new Promise((t) => {
    const e = _$1(() => {
      e(), t();
    }, s);
  });
}
function z$1(s, t, e) {
  const i = e - t, n = new Float32Array(i);
  let a = 0;
  for (; a < i; )
    n[a] = s[(t + a) % s.length], a += 1;
  return n;
}
function it$1(s, t) {
  const e = Math.floor(s.length / t), i = new Float32Array(e);
  for (let n = 0; n < e; n++) {
    const a = n * t, r = Math.floor(a), o = a - r;
    r + 1 < s.length ? i[n] = s[r] * (1 - o) + s[r + 1] * o : i[n] = s[r];
  }
  return i;
}
const x = {
  sampleRate: 48e3,
  channelCount: 2,
  codec: "mp4a.40.2"
};
function W$1(s, t) {
  const e = t.videoTracks[0], i = {};
  if (e != null) {
    const a = Mt(s.getTrackById(e.id))?.buffer, { descKey: r, type: o } = e.codec.startsWith("avc1") ? { descKey: "avcDecoderConfigRecord", type: "avc1" } : e.codec.startsWith("hvc1") ? { descKey: "hevcDecoderConfigRecord", type: "hvc1" } : { descKey: "", type: "" };
    r !== "" && (i.videoTrackConf = {
      timescale: e.timescale,
      duration: e.duration,
      width: e.video.width,
      height: e.video.height,
      brands: t.brands,
      type: o,
      [r]: a
    }), i.videoDecoderConf = {
      codec: e.codec,
      codedHeight: e.video.height,
      codedWidth: e.video.width,
      description: a
    };
  }
  const n = t.audioTracks[0];
  if (n != null) {
    const a = Bt(s), r = a == null ? {} : _t(a);
    i.audioTrackConf = {
      timescale: n.timescale,
      samplerate: r.sampleRate ?? n.audio.sample_rate,
      channel_count: r.numberOfChannels ?? n.audio.channel_count,
      hdlr: "soun",
      type: n.codec.startsWith("mp4a") ? "mp4a" : n.codec,
      description: a
    }, i.audioDecoderConf = {
      codec: r.codec ?? x.codec,
      numberOfChannels: r.numberOfChannels ?? n.audio.channel_count,
      sampleRate: r.sampleRate ?? n.audio.sample_rate
    };
  }
  return i;
}
function Mt(s) {
  for (const t of s.mdia.minf.stbl.stsd.entries) {
    const e = t.avcC ?? t.hvcC ?? t.av1C ?? t.vpcC;
    if (e != null) {
      const i = new F$2.DataStream(
        void 0,
        0,
        F$2.DataStream.BIG_ENDIAN
      );
      return e.write(i), new Uint8Array(i.buffer.slice(8));
    }
  }
}
function Bt(s, t = "mp4a") {
  return s.moov?.traks.map((i) => i.mdia.minf.stbl.stsd.entries).flat().find(({ type: i }) => i === t)?.esds;
}
function _t(s) {
  let t = "mp4a";
  const e = s.esd.descs[0];
  if (e == null) return {};
  t += "." + e.oti.toString(16);
  const i = e.descs[0];
  if (i == null)
    return t.endsWith("40") && (t += ".2"), { codec: t };
  const n = (i.data[0] & 248) >> 3;
  t += "." + n;
  const [a, r] = i.data, o = ((a & 7) << 1) + (r >> 7), c = (r & 127) >> 3;
  return {
    codec: t,
    sampleRate: [
      96e3,
      88200,
      64e3,
      48e3,
      44100,
      32e3,
      24e3,
      22050,
      16e3,
      12e3,
      11025,
      8e3,
      7350
    ][o],
    numberOfChannels: c
  };
}
async function Ot(s, t, e) {
  const i = F$2.createFile(false);
  i.onReady = (a) => {
    t({ mp4boxFile: i, info: a });
    const r = a.videoTracks[0]?.id;
    r != null && i.setExtractionOptions(r, "video", { nbSamples: 100 });
    const o = a.audioTracks[0]?.id;
    o != null && i.setExtractionOptions(o, "audio", { nbSamples: 100 }), i.start();
  }, i.onSamples = e, await n();
  async function n() {
    let a = 0;
    const r = 30 * 1024 * 1024;
    for (; ; ) {
      const o = await s.read(r, {
        at: a
      });
      if (o.byteLength === 0) break;
      o.fileStart = a;
      const c = i.appendBuffer(o);
      if (c == null) break;
      a = c;
    }
    i.stop();
  }
}
function zt(s) {
  if (s?.length !== 9) return {};
  const t = new Int32Array(s.buffer), e = t[0] / 65536, i = t[1] / 65536, n = t[3] / 65536, a = t[4] / 65536, r = t[6] / 65536, o = t[7] / 65536, c = t[8] / (1 << 30), l = Math.sqrt(e * e + n * n), h = Math.sqrt(i * i + a * a), u = Math.atan2(n, e), d = u * 180 / Math.PI;
  return {
    scaleX: l,
    scaleY: h,
    rotationRad: u,
    rotationDeg: d,
    translateX: r,
    translateY: o,
    perspective: c
  };
}
function Vt(s, t, e) {
  const i = (Math.round(e / 90) * 90 + 360) % 360;
  if (i === 0) return (c) => c;
  const n = i === 90 || i === 270 ? t : s, a = i === 90 || i === 270 ? s : t, r = new OffscreenCanvas(n, a), o = r.getContext("2d");
  return o.translate(n / 2, a / 2), o.rotate(-i * Math.PI / 180), o.translate(-s / 2, -t / 2), (c) => {
    if (c == null) return null;
    o.drawImage(c, 0, 0);
    const l = new VideoFrame(r, {
      timestamp: c.timestamp,
      duration: c.duration ?? void 0
    });
    return c.close(), l;
  };
}
let X = 0;
function B(s) {
  return s.kind === "file" && s.createReader instanceof Function;
}
let I$1 = class I {
  #t = X++;
  #n = S$1.create(`MP4Clip id:${this.#t},`);
  ready;
  #e = false;
  #s = {
    // 微秒
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0
  };
  get meta() {
    return { ...this.#s };
  }
  #a;
  /** 存储视频头（box: ftyp, moov）的二进制数据 */
  #r = [];
  /**
   * 提供视频头（box: ftyp, moov）的二进制数据
   * 使用任意 mp4 demxer 解析即可获得详细的视频信息
   * 单元测试包含使用 mp4box.js 解析示例代码
   */
  async getFileHeaderBinData() {
    await this.ready;
    const t = await this.#a.getOriginFile();
    if (t == null) throw Error("MP4Clip localFile is not origin file");
    return await new Blob(
      this.#r.map(
        ({ start: e, size: i }) => t.slice(e, e + i)
      )
    ).arrayBuffer();
  }
  /**存储视频平移旋转信息，目前只还原旋转 */
  #i = {
    perspective: 1,
    rotationRad: 0,
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
  };
  #o = (t) => t;
  #l = 1;
  #c = [];
  #d = [];
  #m = null;
  #u = null;
  #f = {
    video: null,
    audio: null
  };
  #h = { audio: true };
  constructor(t, e = {}) {
    if (!(t instanceof ReadableStream) && !B(t) && !Array.isArray(t.videoSamples))
      throw Error("Illegal argument");
    this.#h = { audio: true, ...e }, this.#l = typeof e.audio == "object" && "volume" in e.audio ? e.audio.volume : 1;
    const i = async (n) => (await B$1(this.#a, n), this.#a);
    this.#a = B(t) ? t : "localFile" in t ? t.localFile : ae(), this.ready = (t instanceof ReadableStream ? i(t).then(
      (n) => J(n, this.#h)
    ) : B(t) ? J(t, this.#h) : Promise.resolve(t)).then(
      async ({
        videoSamples: n,
        audioSamples: a,
        decoderConf: r,
        headerBoxPos: o,
        parsedMatrix: c
      }) => {
        this.#c = n, this.#d = a, this.#f = r, this.#r = o, this.#i = c;
        const { videoFrameFinder: l, audioFrameFinder: h } = Ut(
          {
            video: r.video == null ? null : {
              ...r.video,
              hardwareAcceleration: this.#h.__unsafe_hardwareAcceleration__
            },
            audio: r.audio
          },
          await this.#a.createReader(),
          n,
          a,
          this.#h.audio !== false ? this.#l : 0
        );
        this.#m = l, this.#u = h;
        const { codedWidth: u, codedHeight: d } = r.video ?? {};
        return u && d && (this.#o = Vt(
          u,
          d,
          c.rotationDeg
        )), this.#s = Lt(
          r,
          n,
          a,
          c.rotationDeg
        ), this.#n.info("MP4Clip meta:", this.#s), { ...this.#s };
      }
    );
  }
  /**
   * 拦截 {@link MP4Clip.tick} 方法返回的数据，用于对图像、音频数据二次处理
   * @param time 调用 tick 的时间
   * @param tickRet tick 返回的数据
   *
   * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
   */
  tickInterceptor = async (t, e) => e;
  /**
   * 获取素材指定时刻的图像帧、音频数据
   * @param time 微秒
   */
  async tick(t) {
    if (t >= this.#s.duration)
      return await this.tickInterceptor(t, {
        audio: await this.#u?.find(t) ?? [],
        state: "done"
      });
    const [e, i] = await Promise.all([
      this.#u?.find(t) ?? [],
      this.#m?.find(t).then(this.#o)
    ]);
    return i == null ? await this.tickInterceptor(t, {
      audio: e,
      state: "success"
    }) : await this.tickInterceptor(t, {
      video: i,
      audio: e,
      state: "success"
    });
  }
  #p = new AbortController();
  /**
   * 生成缩略图，默认每个关键帧生成一个 100px 宽度的缩略图。
   *
   * @param imgWidth 缩略图宽度，默认 100
   * @param opts Partial<ThumbnailOpts>
   * @returns Promise<Array<{ ts: number; img: Blob }>>
   */
  async thumbnails(t = 100, e) {
    this.#p.abort(), this.#p = new AbortController();
    const i = this.#p.signal;
    await this.ready;
    const n = "generate thumbnails aborted";
    if (i.aborted) throw Error(n);
    const { width: a, height: r } = this.#s, o = Xt(
      t,
      Math.round(r * (t / a)),
      { quality: 0.1, type: "image/png" }
    );
    return new Promise(
      async (c, l) => {
        let h = [];
        const u = this.#f.video;
        if (u == null || this.#c.length === 0) {
          d();
          return;
        }
        i.addEventListener("abort", () => {
          l(Error(n));
        });
        async function d() {
          i.aborted || c(
            await Promise.all(
              h.map(async (p) => ({
                ts: p.ts,
                img: await p.img
              }))
            )
          );
        }
        function y(p) {
          h.push({
            ts: p.timestamp,
            img: o(p)
          });
        }
        const { start: m = 0, end: f = this.#s.duration, step: w } = e ?? {};
        if (w) {
          let p = m;
          const g = new nt$1(
            await this.#a.createReader(),
            this.#c,
            {
              ...u,
              hardwareAcceleration: this.#h.__unsafe_hardwareAcceleration__
            }
          );
          for (; p <= f && !i.aborted; ) {
            const b = await g.find(p);
            b && y(b), p += w;
          }
          g.destroy(), d();
        } else
          await Jt(
            this.#c,
            this.#a,
            u,
            i,
            { start: m, end: f },
            (p, g) => {
              p != null && y(p), g && d();
            }
          );
      }
    );
  }
  async split(t) {
    if (await this.ready, t <= 0 || t >= this.#s.duration)
      throw Error('"time" out of bounds');
    const [e, i] = Yt(
      this.#c,
      t
    ), [n, a] = Gt(
      this.#d,
      t
    ), r = new I(
      {
        localFile: this.#a,
        videoSamples: e ?? [],
        audioSamples: n ?? [],
        decoderConf: this.#f,
        headerBoxPos: this.#r,
        parsedMatrix: this.#i
      },
      this.#h
    ), o = new I(
      {
        localFile: this.#a,
        videoSamples: i ?? [],
        audioSamples: a ?? [],
        decoderConf: this.#f,
        headerBoxPos: this.#r,
        parsedMatrix: this.#i
      },
      this.#h
    );
    return await Promise.all([r.ready, o.ready]), [r, o];
  }
  async clone() {
    await this.ready;
    const t = new I(
      {
        localFile: this.#a,
        videoSamples: [...this.#c],
        audioSamples: [...this.#d],
        decoderConf: this.#f,
        headerBoxPos: this.#r,
        parsedMatrix: this.#i
      },
      this.#h
    );
    return await t.ready, t.tickInterceptor = this.tickInterceptor, t;
  }
  /**
   * 拆分 MP4Clip 为仅包含视频轨道和音频轨道的 MP4Clip
   * @returns Mp4CLip[]
   */
  async splitTrack() {
    await this.ready;
    const t = [];
    if (this.#c.length > 0) {
      const e = new I(
        {
          localFile: this.#a,
          videoSamples: [...this.#c],
          audioSamples: [],
          decoderConf: {
            video: this.#f.video,
            audio: null
          },
          headerBoxPos: this.#r,
          parsedMatrix: this.#i
        },
        this.#h
      );
      await e.ready, e.tickInterceptor = this.tickInterceptor, t.push(e);
    }
    if (this.#d.length > 0) {
      const e = new I(
        {
          localFile: this.#a,
          videoSamples: [],
          audioSamples: [...this.#d],
          decoderConf: {
            audio: this.#f.audio,
            video: null
          },
          headerBoxPos: this.#r,
          parsedMatrix: this.#i
        },
        this.#h
      );
      await e.ready, e.tickInterceptor = this.tickInterceptor, t.push(e);
    }
    return t;
  }
  destroy() {
    this.#e || (this.#n.info("MP4Clip destroy"), this.#e = true, this.#m?.destroy(), this.#u?.destroy());
  }
};
function Lt(s, t, e, i) {
  const n = {
    duration: 0,
    width: 0,
    height: 0,
    audioSampleRate: 0,
    audioChanCount: 0
  };
  if (s.video != null && t.length > 0) {
    n.width = s.video.codedWidth ?? 0, n.height = s.video.codedHeight ?? 0;
    const o = (Math.round(i / 90) * 90 + 360) % 360;
    (o === 90 || o === 270) && ([n.width, n.height] = [n.height, n.width]);
  }
  s.audio != null && e.length > 0 && (n.audioSampleRate = x.sampleRate, n.audioChanCount = x.channelCount);
  let a = 0, r = 0;
  if (t.length > 0)
    for (let o = t.length - 1; o >= 0; o--) {
      const c = t[o];
      if (!c.deleted) {
        a = c.cts + c.duration;
        break;
      }
    }
  if (e.length > 0) {
    const o = e.at(-1);
    r = o.cts + o.duration;
  }
  return n.duration = Math.max(a, r), n;
}
function Ut(s, t, e, i, n) {
  return {
    audioFrameFinder: n === 0 || s.audio == null || i.length === 0 ? null : new $t(
      t,
      i,
      s.audio,
      {
        volume: n,
        targetSampleRate: x.sampleRate
      }
    ),
    videoFrameFinder: s.video == null || e.length === 0 ? null : new nt$1(
      t,
      e,
      s.video
    )
  };
}
async function J(s, t = {}) {
  let e = null;
  const i = { video: null, audio: null };
  let n = [], a = [], r = [];
  const o = {
    perspective: 1,
    rotationRad: 0,
    rotationDeg: 0,
    scaleX: 1,
    scaleY: 1,
    translateX: 0,
    translateY: 0
  };
  let c = -1, l = -1;
  const h = await s.createReader();
  await Ot(
    h,
    async (d) => {
      e = d.info;
      const y = d.mp4boxFile.ftyp;
      r.push({ start: y.start, size: y.size });
      const m = d.mp4boxFile.moov;
      r.push({ start: m.start, size: m.size }), Object.assign(o, zt(e.videoTracks[0]?.matrix));
      let { videoDecoderConf: f, audioDecoderConf: w } = W$1(
        d.mp4boxFile,
        d.info
      );
      if (i.video = f ?? null, i.audio = w ?? null, f == null && w == null && S$1.error("MP4Clip no video and audio track"), w != null) {
        const { supported: p } = await AudioDecoder.isConfigSupported(w);
        p || S$1.error(`MP4Clip audio codec is not supported: ${w.codec}`);
      }
      if (f != null) {
        const { supported: p } = await VideoDecoder.isConfigSupported(f);
        p || S$1.error(`MP4Clip video codec is not supported: ${f.codec}`);
      }
      S$1.info(
        "mp4BoxFile moov ready",
        {
          ...d.info,
          tracks: null,
          videoTracks: null,
          audioTracks: null
        },
        i
      );
    },
    (d, y, m) => {
      if (y === "video") {
        c === -1 && (c = m[0].dts);
        for (const f of m)
          n.push(Q(f, c, "video"));
      } else if (y === "audio" && t.audio) {
        l === -1 && (l = m[0].dts);
        for (const f of m)
          a.push(Q(f, l, "audio"));
      }
    }
  ), await h.close();
  const u = n.at(-1) ?? a.at(-1);
  if (e == null)
    throw Error("MP4Clip stream is done, but not emit ready");
  if (u == null)
    throw Error("MP4Clip stream not contain any sample");
  return L$1(n), S$1.info("mp4 stream parsed"), {
    videoSamples: n,
    audioSamples: a,
    decoderConf: i,
    headerBoxPos: r,
    parsedMatrix: o
  };
}
function Q(s, t = 0, e) {
  let i = s.offset;
  const n = e === "video" && s.is_sync ? jt(s.data, s.description.type) : -1;
  let a = s.size;
  return n > 0 && (i += n, a -= n), {
    ...s,
    is_idr: n >= 0,
    offset: i,
    size: a,
    cts: (s.cts - t) / s.timescale * 1e6,
    dts: (s.dts - t) / s.timescale * 1e6,
    duration: s.duration / s.timescale * 1e6,
    timescale: 1e6,
    // 音频数据量可控，直接保存在内存中
    data: e === "video" ? null : s.data
  };
}
let nt$1 = class nt {
  constructor(t, e, i) {
    this.localFileReader = t, this.samples = e, this.conf = i;
  }
  #t = null;
  #n = 0;
  #e = { abort: false, st: performance.now() };
  find = async (t) => {
    (this.#t == null || this.#t.state === "closed" || t <= this.#n || t - this.#n > 3e6) && this.#h(t), this.#e.abort = true, this.#n = t, this.#e = { abort: false, st: performance.now() };
    const e = await this.#m(t, this.#t, this.#e);
    return this.#c = 0, e;
  };
  // fix VideoFrame duration is null
  #s = 0;
  #a = false;
  #r = 0;
  #i = [];
  #o = 0;
  #l = 0;
  #c = 0;
  #d = false;
  #m = async (t, e, i) => {
    if (e == null || e.state === "closed" || i.abort) return null;
    if (this.#i.length > 0) {
      const n = this.#i[0];
      return t < n.timestamp ? null : (this.#i.shift(), t > n.timestamp + (n.duration ?? 0) ? (n.close(), await this.#m(t, e, i)) : (!this.#d && this.#i.length < 10 && this.#f(e).catch((a) => {
        throw this.#d = true, this.#h(t), a;
      }), n));
    }
    if (this.#u || this.#o < this.#l && e.decodeQueueSize > 0) {
      if (performance.now() - i.st > 6e3)
        throw Error(
          `MP4Clip.tick video timeout, ${JSON.stringify(this.#p())}`
        );
      this.#c += 1, await H$1(15);
    } else {
      if (this.#r >= this.samples.length)
        return null;
      try {
        await this.#f(e);
      } catch (n) {
        throw this.#h(t), n;
      }
    }
    return await this.#m(t, e, i);
  };
  #u = false;
  #f = async (t) => {
    if (this.#u || t.decodeQueueSize > 600) return;
    let e = this.#r + 1;
    if (e > this.samples.length) return;
    this.#u = true;
    let i = false;
    for (; e < this.samples.length; e++) {
      const n = this.samples[e];
      if (!i && !n.deleted && (i = true), n.is_idr) break;
    }
    if (i) {
      const n = this.samples.slice(this.#r, e);
      if (n[0]?.is_idr !== true)
        S$1.warn("First sample not idr frame");
      else {
        const a = performance.now(), r = await st$1(n, this.localFileReader), o = performance.now() - a;
        if (o > 1e3) {
          const c = n[0], l = n.at(-1), h = l.offset + l.size - c.offset;
          S$1.warn(
            `Read video samples time cost: ${Math.round(o)}ms, file chunk size: ${h}`
          );
        }
        if (t.state === "closed") return;
        this.#s = r[0]?.duration ?? 0, V$1(t, r, {
          onDecodingError: (c) => {
            if (this.#a)
              throw c;
            this.#o === 0 && (this.#a = true, S$1.warn("Downgrade to software decode"), this.#h());
          }
        }), this.#l += r.length;
      }
    }
    this.#r = e, this.#u = false;
  };
  #h = (t) => {
    if (this.#u = false, this.#i.forEach((i) => i.close()), this.#i = [], t == null || t === 0)
      this.#r = 0;
    else {
      let i = 0;
      for (let n = 0; n < this.samples.length; n++) {
        const a = this.samples[n];
        if (a.is_idr && (i = n), !(a.cts < t)) {
          this.#r = i;
          break;
        }
      }
    }
    this.#l = 0, this.#o = 0, this.#t?.state !== "closed" && this.#t?.close();
    const e = {
      ...this.conf,
      ...this.#a ? { hardwareAcceleration: "prefer-software" } : {}
    };
    this.#t = new VideoDecoder({
      output: (i) => {
        if (this.#o += 1, i.timestamp === -1) {
          i.close();
          return;
        }
        let n = i;
        i.duration == null && (n = new VideoFrame(i, {
          duration: this.#s
        }), i.close()), this.#i.push(n);
      },
      error: (i) => {
        if (i.message.includes("Codec reclaimed due to inactivity")) {
          this.#t = null, S$1.warn(i.message);
          return;
        }
        const n = `VideoFinder VideoDecoder err: ${i.message}, config: ${JSON.stringify(e)}, state: ${JSON.stringify(this.#p())}`;
        throw S$1.error(n), Error(n);
      }
    }), this.#t.configure(e);
  };
  #p = () => ({
    time: this.#n,
    decState: this.#t?.state,
    decQSize: this.#t?.decodeQueueSize,
    decCusorIdx: this.#r,
    sampleLen: this.samples.length,
    inputCnt: this.#l,
    outputCnt: this.#o,
    cacheFrameLen: this.#i.length,
    softDeocde: this.#a,
    clipIdCnt: X,
    sleepCnt: this.#c,
    memInfo: at$1()
  });
  destroy = () => {
    this.#t?.state !== "closed" && this.#t?.close(), this.#t = null, this.#e.abort = true, this.#i.forEach((t) => t.close()), this.#i = [], this.localFileReader.close();
  };
};
function Nt(s, t) {
  for (let e = 0; e < t.length; e++) {
    const i = t[e];
    if (s >= i.cts && s < i.cts + i.duration)
      return e;
    if (i.cts > s) break;
  }
  return 0;
}
class $t {
  constructor(t, e, i, n) {
    this.localFileReader = t, this.samples = e, this.conf = i, this.#t = n.volume, this.#n = n.targetSampleRate;
  }
  #t = 1;
  #n;
  #e = null;
  #s = { abort: false, st: performance.now() };
  find = async (t) => {
    const e = t <= this.#a || t - this.#a > 1e5;
    (this.#e == null || this.#e.state === "closed" || e) && this.#d(), e && (this.#a = t, this.#r = Nt(t, this.samples)), this.#s.abort = true;
    const i = t - this.#a;
    this.#a = t, this.#s = { abort: false, st: performance.now() };
    const n = await this.#l(
      Math.ceil(i * (this.#n / 1e6)),
      this.#e,
      this.#s
    );
    return this.#o = 0, n;
  };
  #a = 0;
  #r = 0;
  #i = {
    frameCnt: 0,
    data: []
  };
  #o = 0;
  #l = async (t, e = null, i) => {
    if (e == null || i.abort || e.state === "closed" || t === 0)
      return [];
    const n = this.#i.frameCnt - t;
    if (n > 0)
      return n < x.sampleRate / 10 && this.#c(e), K(this.#i, t);
    if (e.decoding) {
      if (performance.now() - i.st > 3e3)
        throw i.abort = true, Error(
          `MP4Clip.tick audio timeout, ${JSON.stringify(this.#m())}`
        );
      this.#o += 1, await H$1(15);
    } else {
      if (this.#r >= this.samples.length - 1)
        return K(this.#i, this.#i.frameCnt);
      this.#c(e);
    }
    return this.#l(t, e, i);
  };
  #c = (t) => {
    if (t.decodeQueueSize > 10) return;
    const i = [];
    let n = this.#r;
    for (; n < this.samples.length; ) {
      const a = this.samples[n];
      if (n += 1, !a.deleted && (i.push(a), i.length >= 10))
        break;
    }
    this.#r = n, t.decode(
      i.map(
        (a) => new EncodedAudioChunk({
          type: "key",
          timestamp: a.cts,
          duration: a.duration,
          data: a.data
        })
      )
    );
  };
  #d = () => {
    this.#a = 0, this.#r = 0, this.#i = {
      frameCnt: 0,
      data: []
    }, this.#e?.close(), this.#e = Ht(
      this.conf,
      {
        resampleRate: x.sampleRate,
        volume: this.#t
      },
      (t) => {
        this.#i.data.push(t), this.#i.frameCnt += t[0].length;
      }
    );
  };
  #m = () => ({
    time: this.#a,
    decState: this.#e?.state,
    decQSize: this.#e?.decodeQueueSize,
    decCusorIdx: this.#r,
    sampleLen: this.samples.length,
    pcmLen: this.#i.frameCnt,
    clipIdCnt: X,
    sleepCnt: this.#o,
    memInfo: at$1()
  });
  destroy = () => {
    this.#e = null, this.#s.abort = true, this.#i = {
      frameCnt: 0,
      data: []
    }, this.localFileReader.close();
  };
}
function Ht(s, t, e) {
  let i = 0, n = 0;
  const a = (h) => {
    if (n += 1, h.length !== 0) {
      if (t.volume !== 1)
        for (const u of h)
          for (let d = 0; d < u.length; d++) u[d] *= t.volume;
      h.length === 1 && (h = [h[0], h[0]]), e(h);
    }
  }, r = Wt(a), o = t.resampleRate !== s.sampleRate;
  let c = new AudioDecoder({
    output: (h) => {
      const u = et$1(h);
      o ? r(
        () => Pt(u, h.sampleRate, {
          rate: t.resampleRate,
          chanCount: h.numberOfChannels
        })
      ) : a(u), h.close();
    },
    error: (h) => {
      h.message.includes("Codec reclaimed due to inactivity") || l("MP4Clip AudioDecoder err", h);
    }
  });
  c.configure(s);
  function l(h, u) {
    const d = `${h}: ${u.message}, state: ${JSON.stringify(
      {
        qSize: c.decodeQueueSize,
        state: c.state,
        inputCnt: i,
        outputCnt: n
      }
    )}`;
    throw S$1.error(d), Error(d);
  }
  return {
    decode(h) {
      i += h.length;
      try {
        for (const u of h) c.decode(u);
      } catch (u) {
        l("decode audio chunk error", u);
      }
    },
    close() {
      c.state !== "closed" && c.close();
    },
    get decoding() {
      return i > n && c.decodeQueueSize > 0;
    },
    get state() {
      return c.state;
    },
    get decodeQueueSize() {
      return c.decodeQueueSize;
    }
  };
}
function Wt(s) {
  const t = [];
  let e = 0;
  function i(r, o) {
    t[o] = r, n();
  }
  function n() {
    const r = t[e];
    r != null && (s(r), e += 1, n());
  }
  let a = 0;
  return (r) => {
    const o = a;
    a += 1, r().then((c) => i(c, o)).catch((c) => i(c, o));
  };
}
function K(s, t) {
  const e = [new Float32Array(t), new Float32Array(t)];
  let i = 0, n = 0;
  for (; n < s.data.length; ) {
    const [a, r] = s.data[n];
    if (i + a.length > t) {
      const o = t - i;
      e[0].set(a.subarray(0, o), i), e[1].set(r.subarray(0, o), i), s.data[n][0] = a.subarray(o, a.length), s.data[n][1] = r.subarray(o, r.length);
      break;
    } else
      e[0].set(a, i), e[1].set(r, i), i += a.length, n++;
  }
  return s.data = s.data.slice(n), s.frameCnt -= t, e;
}
async function st$1(s, t) {
  const e = s[0], i = s.at(-1);
  if (i == null) return [];
  const n = i.offset + i.size - e.offset;
  if (n < 3e7) {
    const a = new Uint8Array(
      await t.read(n, { at: e.offset })
    );
    return s.map((r) => {
      const o = r.offset - e.offset;
      return new EncodedVideoChunk({
        type: r.is_sync ? "key" : "delta",
        timestamp: r.cts,
        duration: r.duration,
        data: a.subarray(o, o + r.size)
      });
    });
  }
  return await Promise.all(
    s.map(async (a) => new EncodedVideoChunk({
      type: a.is_sync ? "key" : "delta",
      timestamp: a.cts,
      duration: a.duration,
      data: await t.read(a.size, {
        at: a.offset
      })
    }))
  );
}
function Xt(s, t, e) {
  const i = new OffscreenCanvas(s, t), n = i.getContext("2d");
  return async (a) => (n.drawImage(a, 0, 0, s, t), a.close(), await i.convertToBlob(e));
}
function Yt(s, t) {
  if (s.length === 0) return [];
  let e = 0, i = 0, n = -1;
  for (let c = 0; c < s.length; c++) {
    const l = s[c];
    if (n === -1 && t < l.cts && (n = c - 1), l.is_idr)
      if (n === -1)
        e = c;
      else {
        i = c;
        break;
      }
  }
  const a = s[n];
  if (a == null) throw Error("Not found video sample by time");
  const r = s.slice(0, i === 0 ? s.length : i).map((c) => ({ ...c }));
  for (let c = e; c < r.length; c++) {
    const l = r[c];
    t < l.cts && (l.deleted = true, l.cts = -1);
  }
  L$1(r);
  const o = s.slice(a.is_idr ? n : e).map((c) => ({ ...c, cts: c.cts - t }));
  for (const c of o)
    c.cts < 0 && (c.deleted = true, c.cts = -1);
  return L$1(o), [r, o];
}
function Gt(s, t) {
  if (s.length === 0) return [void 0, void 0];
  if (s[0].cts >= t)
    return [void 0, s.map((r) => ({ ...r }))];
  if (s[s.length - 1].cts < t)
    return [s.map((r) => ({ ...r })), void 0];
  let i = -1;
  for (let r = 0; r < s.length; r++) {
    const o = s[r];
    if (!(t > o.cts)) {
      i = r;
      break;
    }
  }
  if (i === -1) throw Error("Not found audio sample by time");
  const n = s.slice(0, i).map((r) => ({ ...r })), a = s.slice(i).map((r) => ({ ...r, cts: r.cts - t }));
  return [n, a];
}
function V$1(s, t, e) {
  if (s.state === "configured") {
    for (let i = 0; i < t.length; i++) s.decode(t[i]);
    s.flush().catch((i) => {
      if (!(i instanceof Error)) throw i;
      if (i.message.includes("Decoding error") && e.onDecodingError != null) {
        e.onDecodingError(i);
        return;
      }
      if (!i.message.includes("Aborted due to close"))
        throw i;
    });
  }
}
function jt(s, t) {
  if (t !== "avc1" && t !== "hvc1") return 0;
  const e = new DataView(s.buffer);
  for (let i = 0; i < s.byteLength - 4; ) {
    if (t === "avc1") {
      const n = e.getUint8(i + 4) & 31;
      if (n === 5 || n === 7 || n === 8) return i;
    } else if (t === "hvc1") {
      const n = e.getUint8(i + 4) >> 1 & 63;
      if (n === 19 || n === 20 || n === 32 || n === 33 || n === 34)
        return i;
    }
    i += e.getUint32(i) + 4;
  }
  return -1;
}
async function Jt(s, t, e, i, n, a) {
  const r = await t.createReader(), o = await st$1(
    s.filter(
      (h) => !h.deleted && h.is_sync && h.cts >= n.start && h.cts <= n.end
    ),
    r
  );
  if (o.length === 0 || i.aborted) {
    a(null, true);
    return;
  }
  let c = 0;
  V$1(l(), o, {
    onDecodingError: (h) => {
      S$1.warn("thumbnailsByKeyFrame", h), c === 0 ? V$1(l(true), o, {
        onDecodingError: (u) => {
          r.close(), S$1.error("thumbnailsByKeyFrame retry soft deocde", u);
        }
      }) : (a(null, true), r.close());
    }
  });
  function l(h = false) {
    const u = {
      ...e,
      ...h ? { hardwareAcceleration: "prefer-software" } : {}
    }, d = new VideoDecoder({
      output: (y) => {
        c += 1;
        const m = c === o.length;
        a(y, m), m && (r.close(), d.state !== "closed" && d.close());
      },
      error: (y) => {
        const m = `thumbnails decoder error: ${y.message}, config: ${JSON.stringify(u)}, state: ${JSON.stringify(
          {
            qSize: d.decodeQueueSize,
            state: d.state,
            outputCnt: c,
            inputCnt: o.length
          }
        )}`;
        throw S$1.error(m), Error(m);
      }
    });
    return i.addEventListener("abort", () => {
      r.close(), d.state !== "closed" && d.close();
    }), d.configure(u), d;
  }
}
function L$1(s) {
  let t = 0, e = null;
  for (const i of s)
    if (!i.deleted) {
      if (i.is_sync && (t += 1), t >= 2) break;
      (e == null || i.cts < e.cts) && (e = i);
    }
  e != null && e.cts < 2e5 && (e.duration += e.cts, e.cts = 0);
}
function at$1() {
  try {
    const s = performance.memory;
    return {
      jsHeapSizeLimit: s.jsHeapSizeLimit,
      totalJSHeapSize: s.totalJSHeapSize,
      usedJSHeapSize: s.usedJSHeapSize,
      percentUsed: (s.usedJSHeapSize / s.jsHeapSizeLimit).toFixed(3),
      percentTotal: (s.totalJSHeapSize / s.jsHeapSizeLimit).toFixed(3)
    };
  } catch {
    return {};
  }
}
let R$1 = class R {
  ready;
  #t = {
    // 微秒
    duration: 0,
    width: 0,
    height: 0
  };
  /**
   * ⚠️ 静态图片的 duration 为 Infinity
   *
   * 使用 Sprite 包装时需要将它的 duration 设置为有限数
   *
   */
  get meta() {
    return { ...this.#t };
  }
  #n = null;
  #e = [];
  /**
   * 静态图片可使用流、ImageBitmap 初始化
   *
   * 动图需要使用 VideoFrame[] 或提供图片类型
   */
  constructor(t) {
    const e = (i) => (this.#n = i, this.#t.width = i.width, this.#t.height = i.height, this.#t.duration = 1 / 0, { ...this.#t });
    if (t instanceof ReadableStream)
      this.ready = new Response(t).blob().then((i) => createImageBitmap(i)).then(e);
    else if (t instanceof ImageBitmap)
      this.ready = Promise.resolve(e(t));
    else if (Array.isArray(t) && t.every((i) => i instanceof VideoFrame)) {
      this.#e = t;
      const i = this.#e[0];
      if (i == null) throw Error("The frame count must be greater than 0");
      this.#t = {
        width: i.displayWidth,
        height: i.displayHeight,
        duration: this.#e.reduce(
          (n, a) => n + (a.duration ?? 0),
          0
        )
      }, this.ready = Promise.resolve({ ...this.#t, duration: 1 / 0 });
    } else if ("type" in t)
      this.ready = this.#s(
        t.stream,
        t.type
      ).then(() => ({
        width: this.#t.width,
        height: this.#t.height,
        duration: 1 / 0
      }));
    else
      throw Error("Illegal arguments");
  }
  async #s(t, e) {
    this.#e = await Dt(t, e);
    const i = this.#e[0];
    if (i == null) throw Error("No frame available in gif");
    this.#t = {
      duration: this.#e.reduce((n, a) => n + (a.duration ?? 0), 0),
      width: i.codedWidth,
      height: i.codedHeight
    }, S$1.info("ImgClip ready:", this.#t);
  }
  tickInterceptor = async (t, e) => e;
  async tick(t) {
    if (this.#n != null)
      return await this.tickInterceptor(t, {
        video: await createImageBitmap(this.#n),
        state: "success"
      });
    const e = t % this.#t.duration;
    return await this.tickInterceptor(t, {
      video: (this.#e.find(
        (i) => e >= i.timestamp && e <= i.timestamp + (i.duration ?? 0)
      ) ?? this.#e[0]).clone(),
      state: "success"
    });
  }
  async split(t) {
    if (await this.ready, this.#n != null)
      return [
        new R(await createImageBitmap(this.#n)),
        new R(await createImageBitmap(this.#n))
      ];
    let e = -1;
    for (let a = 0; a < this.#e.length; a++) {
      const r = this.#e[a];
      if (!(t > r.timestamp)) {
        e = a;
        break;
      }
    }
    if (e === -1) throw Error("Not found frame by time");
    const i = this.#e.slice(0, e).map((a) => new VideoFrame(a)), n = this.#e.slice(e).map(
      (a) => new VideoFrame(a, {
        timestamp: a.timestamp - t
      })
    );
    return [new R(i), new R(n)];
  }
  async clone() {
    await this.ready;
    const t = this.#n == null ? this.#e.map((i) => i.clone()) : await createImageBitmap(this.#n), e = new R(t);
    return e.tickInterceptor = this.tickInterceptor, e;
  }
  destroy() {
    S$1.info("ImgClip destroy"), this.#n?.close(), this.#e.forEach((t) => t.close());
  }
};
class A {
  static ctx = null;
  ready;
  #t = {
    // 微秒
    duration: 0,
    width: 0,
    height: 0
  };
  /**
   * 音频元信息
   *
   * ⚠️ 注意，这里是转换后（标准化）的元信息，非原始音频元信息
   */
  get meta() {
    return {
      ...this.#t,
      sampleRate: x.sampleRate,
      chanCount: 2
    };
  }
  // 使用类型断言来避免 ArrayBufferLike 和 ArrayBuffer 的类型兼容性问题
  #n = new Float32Array();
  #e = new Float32Array();
  /**
   * 获取音频素材完整的 PCM 数据
   */
  getPCMData() {
    return [this.#n, this.#e];
  }
  #s;
  /**
   *
   * @param dataSource 音频文件流
   * @param opts 音频配置，控制音量、是否循环
   */
  constructor(t, e = {}) {
    this.#s = {
      loop: false,
      volume: 1,
      ...e
    }, this.ready = this.#a(t).then(() => ({
      // audio 没有宽高，无需绘制
      width: 0,
      height: 0,
      duration: e.loop ? 1 / 0 : this.#t.duration
    }));
  }
  async #a(t) {
    A.ctx == null && (A.ctx = new AudioContext({
      sampleRate: x.sampleRate
    }));
    const e = performance.now(), i = t instanceof ReadableStream ? await Kt(t, A.ctx) : t;
    S$1.info("Audio clip decoded complete:", performance.now() - e);
    const n = this.#s.volume;
    if (n !== 1)
      for (const a of i)
        for (let r = 0; r < a.length; r += 1) a[r] *= n;
    this.#t.duration = i[0].length / x.sampleRate * 1e6, this.#n = i[0], this.#e = i[1] ?? this.#n, S$1.info(
      "Audio clip convert to AudioData, time:",
      performance.now() - e
    );
  }
  /**
   * 拦截 {@link AudioClip.tick} 方法返回的数据，用于对音频数据二次处理
   * @param time 调用 tick 的时间
   * @param tickRet tick 返回的数据
   *
   * @see [移除视频绿幕背景](https://webav-tech.github.io/WebAV/demo/3_2-chromakey-video)
   */
  tickInterceptor = async (t, e) => e;
  // 微秒
  #r = 0;
  #i = 0;
  /**
   * 返回上次与当前时刻差对应的音频 PCM 数据；
   *
   * 若差值超过 3s 或当前时间小于上次时间，则重置状态
   * @example
   * tick(0) // => []
   * tick(1e6) // => [leftChanPCM(1s), rightChanPCM(1s)]
   *
   */
  async tick(t) {
    if (!this.#s.loop && t >= this.#t.duration)
      return await this.tickInterceptor(t, { audio: [], state: "done" });
    const e = t - this.#r;
    if (t < this.#r || e > 3e6)
      return this.#r = t, this.#i = Math.ceil(
        this.#r / 1e6 * x.sampleRate
      ), await this.tickInterceptor(t, {
        audio: [new Float32Array(0), new Float32Array(0)],
        state: "success"
      });
    this.#r = t;
    const i = Math.ceil(
      e / 1e6 * x.sampleRate
    ), n = this.#i + i, a = this.#s.loop ? [
      z$1(this.#n, this.#i, n),
      z$1(this.#e, this.#i, n)
    ] : [
      this.#n.slice(this.#i, n),
      this.#e.slice(this.#i, n)
    ];
    return this.#i = n, await this.tickInterceptor(t, { audio: a, state: "success" });
  }
  /**
   * 按指定时间切割，返回前后两个音频素材
   * @param time 时间，单位微秒
   */
  async split(t) {
    await this.ready;
    const e = Math.ceil(t / 1e6 * x.sampleRate), i = new A(
      this.getPCMData().map((a) => a.slice(0, e)),
      this.#s
    ), n = new A(
      this.getPCMData().map((a) => a.slice(e)),
      this.#s
    );
    return [i, n];
  }
  async clone() {
    await this.ready;
    const t = new A(this.getPCMData(), this.#s);
    return await t.ready, t;
  }
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    this.#n = new Float32Array(0), this.#e = new Float32Array(0), S$1.info("---- audioclip destroy ----");
  }
  static concatAudioClip = Qt;
}
async function Qt(s, t) {
  const e = [];
  for (const i of s)
    await i.ready, e.push(i.getPCMData());
  return new A(tt$1(e), t);
}
async function Kt(s, t) {
  const e = await new Response(s).arrayBuffer();
  return $$1(await t.decodeAudioData(e));
}
let rt$1 = class rt {
  static ctx = null;
  ready;
  #t = {
    // 微秒
    duration: 0,
    width: 0,
    height: 0
  };
  get meta() {
    return {
      ...this.#t
    };
  }
  #n = () => {
  };
  /**
   * 实时流的音轨
   */
  audioTrack;
  #e = null;
  #s;
  constructor(t) {
    this.#s = t, this.audioTrack = t.getAudioTracks()[0] ?? null, this.#t.duration = 1 / 0;
    const e = t.getVideoTracks()[0];
    e != null ? (e.contentHint = "motion", this.ready = new Promise((i) => {
      this.#n = qt(e, (n) => {
        this.#t.width = n.width, this.#t.height = n.height, this.#e = n, i(this.meta);
      });
    })) : this.ready = Promise.resolve(this.meta);
  }
  async tick() {
    return {
      video: this.#e == null ? null : await createImageBitmap(this.#e),
      audio: [],
      state: "success"
    };
  }
  async split() {
    return [await this.clone(), await this.clone()];
  }
  async clone() {
    return new rt(this.#s.clone());
  }
  destroy() {
    this.#s.getTracks().forEach((t) => t.stop()), this.#n();
  }
};
function qt(s, t) {
  let e = false, i;
  return Y$2(
    new MediaStreamTrackProcessor({
      track: s
    }).readable,
    {
      onChunk: async (n) => {
        if (!e) {
          const { displayHeight: a, displayWidth: r } = n, o = r ?? 0, c = a ?? 0, l = new OffscreenCanvas(o, c);
          i = l.getContext("2d"), t(l), e = true;
        }
        i.drawImage(n, 0, 0), n.close();
      },
      onDone: async () => {
      }
    }
  );
}
let oe = 0;
async function ct$1(s) {
  s() > 50 && (await H$1(15), await ct$1(s));
}
class xe {
  /**
   * 检测当前环境的兼容性
   * @param args.videoCodec 指定视频编码格式，默认 avc1.42E032
   * @param args.width 指定视频宽度，默认 1920
   * @param args.height 指定视频高度，默认 1080
   * @param args.bitrate 指定视频比特率，默认 5e6
   */
  static async isSupported(t = {}) {
    return (self.OffscreenCanvas != null && self.VideoEncoder != null && self.VideoDecoder != null && self.VideoFrame != null && self.AudioEncoder != null && self.AudioDecoder != null && self.AudioData != null && ((await self.VideoEncoder.isConfigSupported({
      codec: t.videoCodec ?? "avc1.42E032",
      width: t.width ?? 1920,
      height: t.height ?? 1080,
      bitrate: t.bitrate ?? 7e6
    })).supported ?? false) && (await self.AudioEncoder.isConfigSupported({
      codec: x.codec,
      sampleRate: x.sampleRate,
      numberOfChannels: x.channelCount
    })).supported) ?? false;
  }
  #t = S$1.create(`id:${oe++},`);
  #n = false;
  #e = [];
  #s;
  #a;
  // 中断输出
  #r = null;
  #i;
  #o;
  #l = new M$1();
  on = this.#l.on;
  /**
   * 根据配置创建合成器实例
   * @param opts ICombinatorOpts
   */
  constructor(t = {}) {
    const { width: e = 0, height: i = 0 } = t;
    this.#s = new OffscreenCanvas(e, i);
    const n = this.#s.getContext("2d", { alpha: false });
    if (n == null) throw Error("Can not create 2d offscreen context");
    this.#a = n, this.#i = Object.assign(
      {
        bgColor: "#000",
        width: 0,
        height: 0,
        videoCodec: "avc1.42E032",
        audio: true,
        bitrate: 5e6,
        fps: 30,
        metaDataTags: null
      },
      t
    ), this.#o = e * i > 0;
  }
  /**
   * 添加用于合成视频的 Sprite，视频时长默认取所有素材 duration 字段的最大值
   * @param os Sprite
   * @param opts.main 如果 main 为 true，视频时长为该素材的 duration 值
   */
  async addSprite(t, e = {}) {
    const i = {
      rect: de(["x", "y", "w", "h"], t.rect),
      time: { ...t.time },
      zIndex: t.zIndex
    };
    this.#t.info("Combinator add sprite", i);
    const n = await t.clone();
    this.#t.info("Combinator add sprite ready"), this.#e.push(
      Object.assign(n, {
        main: e.main ?? false,
        expired: false
      })
    ), this.#e.sort((a, r) => a.zIndex - r.zIndex);
  }
  #c(t) {
    const { fps: e, width: i, height: n, videoCodec: a, bitrate: r, audio: o, metaDataTags: c } = this.#i;
    return ee$1({
      video: this.#o ? {
        width: i,
        height: n,
        expectFPS: e,
        codec: a,
        bitrate: r,
        __unsafe_hardwareAcceleration__: this.#i.__unsafe_hardwareAcceleration__
      } : null,
      audio: o === false ? null : {
        codec: "aac",
        sampleRate: x.sampleRate,
        channelCount: x.channelCount
      },
      duration: t,
      metaDataTags: c
    });
  }
  /**
   * 输出视频文件二进制流
   * @param opts.maxTime 允许输出视频的最大时长，超过时长的素材内容会被忽略
   */
  output(t = {}) {
    if (this.#e.length === 0) throw Error("No sprite added");
    const e = this.#e.find((l) => l.main), i = t.maxTime ?? (e != null ? e.time.offset + e.time.duration : Math.max(
      ...this.#e.map((l) => l.time.offset + l.time.duration)
    ));
    if (i === 1 / 0)
      throw Error(
        "Unable to determine the end time, please specify a main sprite, or limit the duration of ImgClip, AudioCli"
      );
    i === -1 && this.#t.warn(
      "Unable to determine the end time, process value don't update"
    ), this.#t.info(`start combinate video, maxTime:${i}`);
    const n = this.#c(i);
    let a = performance.now();
    const r = this.#d(n, i, {
      onProgress: (l) => {
        this.#t.debug("OutputProgress:", l), this.#l.emit("OutputProgress", l);
      },
      onEnded: async () => {
        await n.flush(), this.#t.info(
          "===== output ended =====, cost:",
          performance.now() - a
        ), this.#l.emit("OutputProgress", 1), this.destroy();
      },
      onError: (l) => {
        this.#l.emit("error", l), c(l), this.destroy();
      }
    });
    this.#r = () => {
      r(), n.close(), c();
    };
    const { stream: o, stop: c } = Z$1(
      n.mp4file,
      500,
      this.destroy
    );
    return o;
  }
  /**
   * 销毁实例，释放资源
   */
  destroy() {
    this.#n || (this.#n = true, this.#r?.(), this.#l.destroy());
  }
  #d(t, e, {
    onProgress: i,
    onEnded: n,
    onError: a
  }) {
    let r = 0;
    const o = { aborted: false };
    let c = null;
    (async () => {
      const { fps: d, bgColor: y, audio: m } = this.#i, f = Math.round(1e6 / d), w = this.#a, p = ce({
        ctx: w,
        bgColor: y,
        sprites: this.#e,
        aborter: o
      }), g = le({
        remux: t,
        ctx: w,
        cvs: this.#s,
        outputAudio: m,
        hasVideoTrack: this.#o,
        timeSlice: f,
        fps: d
      });
      let b = 0;
      for (; ; ) {
        if (c != null) return;
        if (o.aborted || e !== -1 && b > e || this.#e.length === 0) {
          u(), await n();
          return;
        }
        r = b / e;
        const { audios: v, mainSprDone: S } = await p(b);
        if (S) {
          u(), await n();
          return;
        }
        if (o.aborted) return;
        g(b, v), b += f, await ct$1(t.getEncodeQueueSize);
      }
    })().catch((d) => {
      c = d, this.#t.error(d), u(), a(d);
    });
    const h = setInterval(() => {
      i(r);
    }, 500), u = () => {
      o.aborted || (o.aborted = true, clearInterval(h), this.#e.forEach((d) => d.destroy()));
    };
    return u;
  }
}
function ce(s) {
  const { ctx: t, bgColor: e, sprites: i, aborter: n } = s, { width: a, height: r } = t.canvas;
  return async (o) => {
    t.fillStyle = e, t.fillRect(0, 0, a, r);
    const c = [];
    let l = false;
    for (const h of i) {
      if (n.aborted) break;
      if (o < h.time.offset || h.expired) continue;
      t.save();
      const { audio: u, done: d } = await h.offscreenRender(t, o - h.time.offset);
      c.push(u), t.restore(), (h.time.duration > 0 && o > h.time.offset + h.time.duration || d) && (h.main && (l = true), h.destroy(), h.expired = true);
    }
    return {
      audios: c,
      mainSprDone: l
    };
  };
}
function le(s) {
  const { ctx: t, cvs: e, outputAudio: i, remux: n, hasVideoTrack: a, timeSlice: r } = s, { width: o, height: c } = e;
  let l = 0;
  const h = Math.floor(3 * s.fps), u = he(1024);
  return (d, y) => {
    if (i !== false)
      for (const m of u(d, y)) n.encodeAudio(m);
    if (a) {
      const m = new VideoFrame(e, {
        duration: r,
        timestamp: d
      });
      n.encodeVideo(m, {
        keyFrame: l % h === 0
      }), t.resetTransform(), t.clearRect(0, 0, o, c), l += 1;
    }
  };
}
function he(s) {
  const t = s * x.channelCount, e = new Float32Array(t * 3);
  let i = 0, n = 0;
  const a = s / x.sampleRate * 1e6, r = new Float32Array(t), o = (c) => {
    let l = 0;
    const h = Math.floor(i / t), u = [];
    for (let d = 0; d < h; d++)
      u.push(
        new AudioData({
          timestamp: n,
          numberOfChannels: x.channelCount,
          numberOfFrames: s,
          sampleRate: x.sampleRate,
          format: "f32",
          data: e.subarray(l, l + t)
        })
      ), l += t, n += a;
    for (e.set(e.subarray(l, i), 0), i -= l; c - n > a; )
      u.push(
        new AudioData({
          timestamp: n,
          numberOfChannels: x.channelCount,
          numberOfFrames: s,
          sampleRate: x.sampleRate,
          format: "f32",
          data: r
        })
      ), n += a;
    return u;
  };
  return (c, l) => {
    const h = Math.max(...l.map((u) => u[0]?.length ?? 0));
    for (let u = 0; u < h; u++) {
      let d = 0, y = 0;
      for (let m = 0; m < l.length; m++) {
        const f = l[m][0]?.[u] ?? 0, w = l[m][1]?.[u] ?? f;
        d += f, y += w;
      }
      e[i] = d, e[i + 1] = y, i += 2;
    }
    return o(c);
  };
}
function de(s, t) {
  return s.reduce(
    (e, i) => (e[i] = t[i], e),
    {}
  );
}
class Y {
  #t = new M$1();
  /**
   * 监听属性变更事件
   * @example
   * rect.on('propsChange', (changedProps) => {})
   */
  on = this.#t.on;
  #n = 0;
  /**
   * x 坐标
   */
  get x() {
    return this.#n;
  }
  set x(t) {
    this.#i("x", t);
  }
  #e = 0;
  get y() {
    return this.#e;
  }
  /**
   * y 坐标
   */
  set y(t) {
    this.#i("y", t);
  }
  #s = 0;
  /**
   * 宽
   */
  get w() {
    return this.#s;
  }
  set w(t) {
    this.#i("w", t);
  }
  #a = 0;
  /**
   * 高
   */
  get h() {
    return this.#a;
  }
  set h(t) {
    this.#i("h", t);
  }
  #r = 0;
  /**
   * 旋转角度
   * @see [MDN Canvas rotate](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/rotate)
   */
  get angle() {
    return this.#r;
  }
  set angle(t) {
    this.#i("angle", t);
  }
  #i(t, e) {
    const i = this[t] !== e;
    switch (t) {
      case "x":
        this.#n = e;
        break;
      case "y":
        this.#e = e;
        break;
      case "w":
        this.#s = e;
        break;
      case "h":
        this.#a = e;
        break;
      case "angle":
        this.#r = e;
        break;
    }
    i && this.#t.emit("propsChange", { [t]: e });
  }
  /**
   * 如果当前实例是 Rect 控制点之一，`master` 将指向该 Rect
   *
   * 控制点的坐标是相对于它的 `master` 定位
   */
  #o = null;
  constructor(t, e, i, n, a) {
    this.x = t ?? 0, this.y = e ?? 0, this.w = i ?? 0, this.h = n ?? 0, this.#o = a ?? null;
  }
  /**
   * 根据坐标、宽高计算出来的矩形中心点
   */
  get center() {
    const { x: t, y: e, w: i, h: n } = this;
    return { x: t + i / 2, y: e + n / 2 };
  }
  /**
   * 是否保持固定宽高比例，禁止变形缩放
   *
   * 值为 true 时，将缺少上下左右四个控制点
   */
  fixedAspectRatio = false;
  /**
   * 是否固定中心点进行缩放
   * 值为 true 时，固定中心点不变进行缩放
   * 值为 false 时，固定对角点不变进行缩放
   */
  fixedScaleCenter = false;
  clone() {
    const { x: t, y: e, w: i, h: n } = this, a = new Y(t, e, i, n, this.#o);
    return a.angle = this.angle, a.fixedAspectRatio = this.fixedAspectRatio, a.fixedScaleCenter = this.fixedScaleCenter, a;
  }
  /**
   * 检测目标坐标是否命中当前实例
   * @param tx 目标点 x 坐标
   * @param ty 目标点 y 坐标
   */
  checkHit(t, e) {
    let { angle: i, center: n, x: a, y: r, w: o, h: c } = this;
    const l = this.#o?.center ?? n, h = this.#o?.angle ?? i;
    this.#o == null && (a = a - l.x, r = r - l.y);
    const u = t - l.x, d = e - l.y;
    let y = u, m = d;
    return h !== 0 && (y = u * Math.cos(h) + d * Math.sin(h), m = d * Math.cos(h) - u * Math.sin(h)), !(y < a || y > a + o || m < r || m > r + c);
  }
}
let lt$1 = class lt {
  /**
   * 控制素材在视频中的空间属性（坐标、旋转、缩放）
   */
  rect = new Y();
  /**
   * 控制素材在的时间偏移、时长、播放速率，常用于剪辑场景时间轴（轨道）模块
   * duration 不能大于引用 {@link IClip} 的时长，单位 微秒
   *
   * playbackRate 控制当前素材的播放速率，1 表示正常播放；
   * **注意**
   *    1. 设置 playbackRate 时需要主动修正 duration
   *    2. 音频使用最简单的插值算法来改变速率，所以改变速率后音调会产生变化，自定义算法请使用 {@link MP4Clip.tickInterceptor} 配合实现
   *
   */
  #t = {
    offset: 0,
    duration: 0,
    playbackRate: 1
  };
  get time() {
    return this.#t;
  }
  set time(t) {
    Object.assign(this.#t, t);
  }
  #n = new M$1();
  /**
   * 监听属性变更事件
   * @example
   * sprite.on('propsChange', (changedProps) => {})
   */
  on = this.#n.on;
  #e = 0;
  get zIndex() {
    return this.#e;
  }
  /**
   * 控制素材间的层级关系，zIndex 值较小的素材会被遮挡
   */
  set zIndex(t) {
    const e = this.#e !== t;
    this.#e = t, e && this.#n.emit("propsChange", { zIndex: t });
  }
  /**
   * 不透明度
   */
  opacity = 1;
  /**
   * 水平或垂直方向翻转素材
   */
  flip = null;
  #s = null;
  #a = null;
  /**
   * @see {@link IClip.ready}
   */
  ready = Promise.resolve();
  constructor() {
    this.rect.on("propsChange", (t) => {
      this.#n.emit("propsChange", { rect: t });
    });
  }
  _render(t) {
    const {
      rect: { center: e, angle: i }
    } = this;
    t.setTransform(
      // 水平 缩放、倾斜
      this.flip === "horizontal" ? -1 : 1,
      0,
      // 垂直 倾斜、缩放
      0,
      this.flip === "vertical" ? -1 : 1,
      // 坐标原点偏移 x y
      e.x,
      e.y
    ), t.rotate((this.flip == null ? 1 : -1) * i), t.globalAlpha = this.opacity;
  }
  /**
   * 给素材添加动画，使用方法参考 css animation
   *
   * @example
   * sprite.setAnimation(
   *   {
   *     '0%': { x: 0, y: 0 },
   *     '25%': { x: 1200, y: 680 },
   *     '50%': { x: 1200, y: 0 },
   *     '75%': { x: 0, y: 680 },
   *     '100%': { x: 0, y: 0 },
   *   },
   *   { duration: 4e6, iterCount: 1 },
   * );
   *
   * @see [视频水印动画](https://webav-tech.github.io/WebAV/demo/2_1-concat-video)
   */
  setAnimation(t, e) {
    this.#s = Object.entries(t).map(([i, n]) => {
      const a = { from: 0, to: 100 }[i] ?? Number(i.slice(0, -1));
      if (isNaN(a) || a > 100 || a < 0)
        throw Error("keyFrame must between 0~100");
      return [a / 100, n];
    }), this.#a = Object.assign({}, this.#a, {
      duration: e.duration,
      delay: e.delay ?? 0,
      iterCount: e.iterCount ?? 1 / 0
    });
  }
  /**
   * 如果当前 sprite 已被设置动画，将 sprite 的动画属性设定到指定时间的状态
   */
  animate(t) {
    if (this.#s == null || this.#a == null || t < this.#a.delay)
      return;
    const e = ue(
      t,
      this.#s,
      this.#a
    );
    for (const i in e)
      switch (i) {
        case "opacity":
          this.opacity = e[i];
          break;
        case "x":
        case "y":
        case "w":
        case "h":
        case "angle":
          this.rect[i] = e[i];
          break;
      }
  }
  /**
   * 将当前 sprite 的属性赋值到目标
   *
   * 用于 clone，或 {@link VisibleSprite} 与 {@link OffscreenSprite} 实例间的类型转换
   */
  copyStateTo(t) {
    t.#s = this.#s, t.#a = this.#a, t.zIndex = this.zIndex, t.opacity = this.opacity, t.flip = this.flip, t.rect = this.rect.clone(), t.time = { ...this.time };
  }
  destroy() {
    this.#n.destroy();
  }
};
function ue(s, t, e) {
  const i = s - e.delay, n = i % e.duration, a = i / e.duration >= e.iterCount || i === e.duration ? 1 : n / e.duration, r = t.findIndex((y) => y[0] >= a);
  if (r === -1) return {};
  const o = t[r - 1], c = t[r], l = c[1];
  if (o == null) return l;
  const h = o[1], u = {}, d = (a - o[0]) / (c[0] - o[0]);
  for (const y in l) {
    const m = y;
    h[m] != null && (u[m] = (l[m] - h[m]) * d + h[m]);
  }
  return u;
}
let ht$1 = class ht extends lt$1 {
  #t;
  // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
  #n = null;
  #e = false;
  constructor(t) {
    super(), this.#t = t, this.ready = t.ready.then(({ width: e, height: i, duration: n }) => {
      this.rect.w = this.rect.w === 0 ? e : this.rect.w, this.rect.h = this.rect.h === 0 ? i : this.rect.h, this.time.duration = this.time.duration === 0 ? n : this.time.duration;
    });
  }
  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  async offscreenRender(t, e) {
    const i = e * this.time.playbackRate;
    this.animate(i), super._render(t);
    const { w: n, h: a } = this.rect, { video: r, audio: o, state: c } = await this.#t.tick(i);
    let l = o ?? [];
    if (o != null && this.time.playbackRate !== 1 && (l = o.map(
      (u) => it$1(u, this.time.playbackRate)
    )), c === "done")
      return {
        audio: l,
        done: true
      };
    const h = r ?? this.#n;
    return h != null && t.drawImage(h, -n / 2, -a / 2, n, a), r != null && (this.#n?.close(), this.#n = r), {
      audio: l,
      done: false
    };
  }
  async clone() {
    const t = new ht(await this.#t.clone());
    return await t.ready, this.copyStateTo(t), t;
  }
  destroy() {
    this.#e || (this.#e = true, S$1.info("OffscreenSprite destroy"), super.destroy(), this.#n?.close(), this.#n = null, this.#t.destroy());
  }
};
let dt$1 = class dt extends lt$1 {
  #t;
  getClip() {
    return this.#t;
  }
  /**
   * 元素是否可见，用于不想删除，期望临时隐藏 Sprite 的场景
   */
  visible = true;
  /**
   * 控制 Sprite 的交互状态
   * - 'interactive': 可选中，可进行移动、缩放、旋转等所有交互
   * - 'selectable': 仅可选中，但不可进行移动、缩放、旋转等交互
   * - 'disabled': 不可选中，也不可交互
   * @default 'interactive'
   */
  interactable = "interactive";
  constructor(t) {
    super(), this.#t = t, this.ready = t.ready.then(({ width: e, height: i, duration: n }) => {
      this.rect.w = this.rect.w === 0 ? e : this.rect.w, this.rect.h = this.rect.h === 0 ? i : this.rect.h, this.time.duration = this.time.duration === 0 ? n : this.time.duration;
    });
  }
  // 保持最近一帧，若 clip 在当前帧无数据，则绘制最近一帧
  #n = null;
  #e = [];
  #s = false;
  async #a(t) {
    if (!this.#s) {
      this.#s = true;
      try {
        const { video: e, audio: i } = await this.#t.tick(
          t * this.time.playbackRate
        );
        if (this.#i) {
          e?.close();
          return;
        }
        e != null && (this.#n?.close(), this.#n = e ?? null), this.#e = i ?? [], i != null && this.time.playbackRate !== 1 && (this.#e = i.map(
          (n) => it$1(n, this.time.playbackRate)
        ));
      } finally {
        this.#s = false;
      }
    }
  }
  /**
   * 提前准备指定 time 的帧
   */
  async preFrame(t) {
    this.#r !== t && (await this.#a(t), this.#r = t);
  }
  #r = -1;
  /**
   * 绘制素材指定时刻的图像到 canvas 上下文，并返回对应的音频数据
   * @param time 指定时刻，微秒
   */
  render(t, e) {
    this.animate(e), super._render(t);
    const { w: i, h: n } = this.rect;
    this.#r !== e && this.#a(e), this.#r = e;
    const a = this.#e;
    this.#e = [];
    const r = this.#n;
    return r != null && t.drawImage(r, -i / 2, -n / 2, i, n), { audio: a };
  }
  copyStateTo(t) {
    super.copyStateTo(t), t instanceof dt && (t.visible = this.visible, t.interactable = this.interactable);
  }
  #i = false;
  destroy() {
    this.#i || (this.#i = true, S$1.info("VisibleSprite destroy"), super.destroy(), this.#n?.close(), this.#n = null, this.#t.destroy());
  }
};

const avCliper = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	AudioClip: A,
	Combinator: xe,
	ImgClip: R$1,
	Log: S$1,
	MP4Clip: I$1,
	MediaStreamClip: rt$1,
	OffscreenSprite: ht$1,
	Rect: Y,
	VisibleSprite: dt$1,
	renderTxt2ImgBitmap: ye
}, Symbol.toStringTag, { value: 'Module' }));

const I = [
  "t",
  "b",
  "l",
  "r",
  "lt",
  "lb",
  "rt",
  "rb",
  "rotate"
];
function R(i) {
  return document.createElement(i);
}
const $ = /* @__PURE__ */ new WeakMap();
function V(i, t) {
  if ($.has(i))
    return $.get(i)(t);
  let n = 10;
  new ResizeObserver((s) => {
    const a = s[0];
    a != null && (n = 10 / (a.contentRect.width / i.width));
  }).observe(i);
  function r(s) {
    const { w: a, h } = s, o = n, c = o / 2, d = a / 2, l = h / 2, u = o * 1.5, p = u / 2;
    return {
      ...s.fixedAspectRatio ? {} : {
        t: new Y(-c, -l - c, o, o, s),
        b: new Y(-c, l - c, o, o, s),
        l: new Y(-d - c, -c, o, o, s),
        r: new Y(d - c, -c, o, o, s)
      },
      lt: new Y(-d - c, -l - c, o, o, s),
      lb: new Y(-d - c, l - c, o, o, s),
      rt: new Y(d - c, -l - c, o, o, s),
      rb: new Y(d - c, l - c, o, o, s),
      rotate: new Y(-p, -l - o * 2 - p, u, u, s)
    };
  }
  return $.set(i, r), r(t);
}
const W = /* @__PURE__ */ new WeakMap();
function L(i) {
  if (W.has(i))
    return W.get(i);
  const t = {
    w: i.clientWidth / i.width,
    h: i.clientHeight / i.height
  };
  return new ResizeObserver(() => {
    t.w = i.clientWidth / i.width, t.h = i.clientHeight / i.height;
  }).observe(i), W.set(i, t), t;
}
var z = /* @__PURE__ */ ((i) => (i.ActiveSpriteChange = "activeSpriteChange", i.AddSprite = "addSprite", i))(z || {});
class tt {
  #t = [];
  #e = null;
  #i = new M$1();
  on = this.#i.on;
  get activeSprite() {
    return this.#e;
  }
  set activeSprite(t) {
    t === this.#e || t?.interactable === "disabled" || (this.#e = t, this.#i.emit("activeSpriteChange", t));
  }
  activeSpriteByCoord(t, n) {
    this.activeSprite = this.getSprites().reverse().find(
      (e) => e.visible && e.interactable !== "disabled" && e.rect.checkHit(t, n)
    ) ?? null;
  }
  async addSprite(t) {
    await t.ready, this.#t.push(t), this.#t = this.#t.sort((n, e) => n.zIndex - e.zIndex), t.on("propsChange", (n) => {
      n.zIndex != null && (this.#t = this.#t.sort((e, r) => e.zIndex - r.zIndex));
    }), this.#i.emit("addSprite", t);
  }
  removeSprite(t) {
    this.#e === t && (this.activeSprite = null), this.#t = this.#t.filter((n) => n !== t), t.destroy();
  }
  getSprites(t = { time: true }) {
    return this.#t.filter(
      (n) => n.visible && (t.time ? this.#s >= n.time.offset && this.#s <= n.time.offset + n.time.duration : true)
    );
  }
  #s = 0;
  updateRenderTime(t) {
    this.#s = t;
    const n = this.activeSprite;
    n != null && (t < n.time.offset || t > n.time.offset + n.time.duration) && (this.activeSprite = null);
  }
  destroy() {
    this.#i.destroy(), this.#t.forEach((t) => t.destroy()), this.#t = [];
  }
}
const et = `
<svg t="1756779136804" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1456" width="16" height="16">
<path d="M1022.793875 170.063604L852.730271 0 511.396938 341.333333 170.063604 0 0 170.063604l341.333333 341.333334L0 852.730271l170.063604 170.063604 341.333334-340.127208 341.333333 340.127208 170.063604-170.063604-340.127208-341.333333 340.127208-341.333334z" fill="#bfbfbf" p-id="1457"></path>
</svg>
`;
function nt(i, t, n) {
  const e = L(t), r = new ResizeObserver(() => {
    n.activeSprite != null && H(n.activeSprite, t, a, h);
  });
  r.observe(t);
  let s = () => {
  };
  const { rectEl: a, ctrlsEl: h } = it(i);
  a.addEventListener("pointerdown", (c) => {
    if (Object.values(h).includes(c.target))
      return;
    const d = t.getBoundingClientRect(), l = (c.clientX - d.left) / e.w, u = (c.clientY - d.top) / e.h;
    n.activeSpriteByCoord(l, u);
  });
  const o = n.on(z.ActiveSpriteChange, (c) => {
    if (s(), c == null) {
      a.style.display = "none";
      return;
    }
    H(c, t, a, h), s = c.on("propsChange", () => {
      H(c, t, a, h);
    });
  });
  return () => {
    r.disconnect(), o(), a.remove(), s();
  };
}
function it(i) {
  const t = R("div");
  t.classList.add("sprite-rect"), t.style.cssText = `
    position: absolute;
    z-index: 3;
    pointer-events: auto;
    border: 1px solid #eee;
    box-sizing: border-box;
    display: none;
    cursor: move;
  `;
  const n = Object.fromEntries(
    I.map((e) => {
      const r = R("div");
      return r.classList.add(`ctrl-key-${e}`), r.style.cssText = `
        display: none;
        position: absolute;
        border: 1px solid #3ee;
        border-radius: 50%;
        box-sizing: border-box;
        background-color: #fff;
        pointer-events: auto;
        cursor: ${e === "rotate" ? "crosshair" : "default"};
        user-select: none;
      `, [e, r];
    })
  );
  return Object.values(n).forEach((e) => t.appendChild(e)), i.appendChild(t), {
    rectEl: t,
    ctrlsEl: n
  };
}
function H(i, t, n, e) {
  if (i.interactable === "disabled") {
    n.style.display = "none";
    return;
  }
  n.style.display = "";
  const r = L(t), { x: s, y: a, w: h, h: o, angle: c } = i.rect;
  Object.assign(n.style, {
    left: `${s * r.w}px`,
    top: `${a * r.h}px`,
    width: `${h * r.w}px`,
    height: `${o * r.h}px`,
    transform: `rotate(${c}rad)`
  });
  const d = V(t, i.rect);
  for (const l in e) {
    const u = l, p = e[u], f = d[u];
    if (f == null) {
      p.style.display = "none";
      continue;
    }
    const w = {
      width: `${f.w * r.w}px`,
      height: `${f.h * r.h}px`,
      transform: `translate(${f.x * r.w}px, ${f.y * r.h}px)`,
      left: "50%",
      top: "50%"
    };
    let b = { display: "none" };
    switch (p.innerHTML = "", i.interactable) {
      case "interactive":
        b = {
          display: "block",
          backgroundColor: "#fff",
          border: "1px solid #3ee"
        };
        break;
      case "selectable":
        u !== "rotate" && (b = {
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent",
          border: "none"
        }, p.innerHTML = et);
        break;
    }
    Object.assign(p.style, w, b);
  }
}
function rt(i, t) {
  const n = (e) => {
    if (e.button !== 0 || e.target !== i) return;
    const r = L(i), { offsetX: s, offsetY: a } = e, h = s / r.w, o = a / r.h;
    t.activeSpriteByCoord(h, o);
  };
  return i.addEventListener("pointerdown", n), () => {
    i.removeEventListener("pointerdown", n);
  };
}
function st(i, t, n) {
  let e = 0, r = 0, s = null;
  const a = pt(i, n), h = n.querySelector(".sprite-rect");
  if (!h) throw Error("sprite-rect DOM Node not found");
  const o = (p) => {
    const f = t.activeSprite;
    if (p.button !== 0 || f == null || f.interactable !== "interactive")
      return;
    const { clientX: w, clientY: b } = p;
    s = f.rect.clone(), a.magneticEffect(f.rect.x, f.rect.y, f.rect), e = w, r = b, window.addEventListener("pointermove", d), window.addEventListener("pointerup", l), p.stopPropagation();
  }, c = L(i), d = (p) => {
    const f = t.activeSprite;
    if (f == null || f.interactable !== "interactive" || s == null)
      return;
    const { clientX: w, clientY: b } = p;
    let m = s.x + (w - e) / c.w, y = s.y + (b - r) / c.h;
    N(
      f.rect,
      i,
      a.magneticEffect(m, y, f.rect)
    );
  }, l = () => {
    a.hide(), window.removeEventListener("pointermove", d), window.removeEventListener("pointerup", l);
  };
  h.addEventListener("pointerdown", o), i.addEventListener("pointerdown", o);
  const u = ot(i, h, t);
  return () => {
    a.destroy(), l(), h.removeEventListener("pointerdown", o), i.removeEventListener("pointerdown", o), u();
  };
}
function ot(i, t, n) {
  const e = Array.from(t.children), r = L(i);
  e.forEach((c, d) => {
    const l = I[d];
    c.addEventListener("pointerdown", (u) => {
      const p = n.activeSprite;
      if (u.button !== 0 || p == null || p.interactable !== "interactive")
        return;
      const { clientX: f, clientY: w } = u;
      l === "rotate" ? lt(
        p.rect,
        dt(p.rect.center, r, i)
      ) : at({
        sprRect: p.rect,
        ctrlKey: l,
        startX: f,
        startY: w,
        cvsRatio: r,
        cvsEl: i
      }), u.stopPropagation();
    });
  }), e[I.indexOf("rotate")].style.cursor = "crosshair";
  const s = [
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize"
  ], a = {
    t: 0,
    rt: 1,
    r: 2,
    rb: 3,
    b: 4,
    lb: 5,
    l: 6,
    lt: 7
  };
  let h = () => {
  };
  const o = n.on(z.ActiveSpriteChange, (c) => {
    if (h(), c == null) return;
    const d = ne(function() {
      const { angle: l } = c.rect, u = l < 0 ? l + 2 * Math.PI : l;
      e.forEach((p, f) => {
        const w = I[f];
        if (w === "rotate") return;
        const b = (a[w] + Math.floor((u + Math.PI / 8) / (Math.PI / 4))) % 8;
        p.style.cursor = s[b];
      });
    }, 300);
    h = c.on("propsChange", (l) => {
      l.rect?.angle != null && d();
    }), d();
  });
  return () => {
    h(), o();
  };
}
function at({
  sprRect: i,
  startX: t,
  startY: n,
  ctrlKey: e,
  cvsRatio: r,
  cvsEl: s
}) {
  const a = i.clone(), h = (c) => {
    const { clientX: d, clientY: l } = c, u = (d - t) / r.w, p = (l - n) / r.h, f = e.length === 1 ? ct : ht, { x: w, y: b, w: m, h: y } = a, T = Math.atan2(y, m), { incW: D, incH: Y, incS: C, rotateAngle: j } = f({
      deltaX: u,
      deltaY: p,
      angle: i.angle,
      ctrlKey: e,
      diagonalAngle: T
    }), S = 10;
    let g = m, M = y, k = a.fixedScaleCenter ? D * 2 : D, O = a.fixedScaleCenter ? Y * 2 : Y, x = C;
    const F = Math.sqrt(y ** 2 + m ** 2), X = Math.sqrt((S * (y / m)) ** 2 + S ** 2);
    switch (e) {
      // 非等比例缩放时，变化的增量范围 由原宽高跟 minSize 的差值决定
      // 非等比例缩放时，根据ctrlKey的不同，固定宽高中的一个，另一个根据增量计算，并考虑最小值限定
      case "l":
        g = Math.max(m + k, S), x = Math.min(C, m - S);
        break;
      case "r":
        g = Math.max(m + k, S), x = Math.max(C, S - m);
        break;
      case "b":
        M = Math.max(y + O, S), x = Math.min(C, y - S);
        break;
      case "t":
        M = Math.max(y + O, S), x = Math.max(C, S - y);
        break;
      // 等比例缩放时，变化（对角线长度）的增量范围由原对角线长度跟 minSize 对角线的差值决定
      // 等比例缩放时，某一边达到最小值时保持宽高比例不变
      case "lt":
      case "lb":
        g = Math.max(m + k, S), M = g === S ? y / m * g : y + O, x = Math.min(C, F - X);
        break;
      case "rt":
      case "rb":
        g = Math.max(m + k, S), M = g === S ? y / m * g : y + O, x = Math.max(C, X - F);
        break;
    }
    let P = w, E = b;
    if (a.fixedScaleCenter)
      P = w + m / 2 - g / 2, E = b + y / 2 - M / 2;
    else {
      const q = x / 2 * Math.cos(j) + w + m / 2, U = x / 2 * Math.sin(j) + b + y / 2;
      P = q - g / 2, E = U - M / 2;
    }
    N(i, s, {
      x: P,
      y: E,
      w: g,
      h: M
    });
  }, o = () => {
    window.removeEventListener("pointermove", h), window.removeEventListener("pointerup", o);
  };
  window.addEventListener("pointermove", h), window.addEventListener("pointerup", o);
}
function ct({
  deltaX: i,
  deltaY: t,
  angle: n,
  ctrlKey: e
}) {
  let r = 0, s = 0, a = 0, h = n;
  return e === "l" || e === "r" ? (r = i * Math.cos(n) + t * Math.sin(n), s = r * (e === "l" ? -1 : 1)) : (e === "t" || e === "b") && (h = n - Math.PI / 2, r = i * Math.cos(h) + t * Math.sin(h), a = r * (e === "b" ? -1 : 1)), { incW: s, incH: a, incS: r, rotateAngle: h };
}
function ht({
  deltaX: i,
  deltaY: t,
  angle: n,
  ctrlKey: e,
  diagonalAngle: r
}) {
  const s = (e === "lt" || e === "rb" ? 1 : -1) * r + n, a = i * Math.cos(s) + t * Math.sin(s), h = e === "lt" || e === "lb" ? -1 : 1, o = a * Math.cos(r) * h, c = a * Math.sin(r) * h;
  return { incW: o, incH: c, incS: a, rotateAngle: s };
}
function lt(i, t) {
  const n = ({ clientX: r, clientY: s }) => {
    const a = r - t.x, h = s - t.y, o = Math.atan2(h, a) + Math.PI / 2;
    i.angle = o;
  }, e = () => {
    window.removeEventListener("pointermove", n), window.removeEventListener("pointerup", e);
  };
  window.addEventListener("pointermove", n), window.addEventListener("pointerup", e);
}
function dt(i, t, n) {
  const e = i.x * t.w, r = i.y * t.h, { left: s, top: a } = n.getBoundingClientRect();
  return {
    x: e + s,
    y: r + a
  };
}
function N(i, t, n) {
  const e = { x: i.x, y: i.y, w: i.w, h: i.h, ...n }, r = t.width * 0.05, s = t.height * 0.05;
  e.x < -e.w + r ? e.x = -e.w + r : e.x > t.width - r && (e.x = t.width - r), e.y < -e.h + s ? e.y = -e.h + s : e.y > t.height - s && (e.y = t.height - s), i.x = e.x, i.y = e.y, i.w = e.w, i.h = e.h;
}
function pt(i, t) {
  const n = "display: none; position: absolute;", e = { w: 0, h: 0, x: 0, y: 0 }, r = {
    vertMiddle: {
      ...e,
      h: 100,
      x: 50,
      ref: { prop: "x", val: ({ w: o }) => (i.width - o) / 2 }
    },
    horMiddle: {
      ...e,
      w: 100,
      y: 50,
      ref: { prop: "y", val: ({ h: o }) => (i.height - o) / 2 }
    },
    top: {
      ...e,
      w: 100,
      ref: { prop: "y", val: () => 0 }
    },
    bottom: {
      ...e,
      w: 100,
      y: 100,
      ref: { prop: "y", val: ({ h: o }) => i.height - o }
    },
    left: {
      ...e,
      h: 100,
      ref: { prop: "x", val: () => 0 }
    },
    right: {
      ...e,
      h: 100,
      x: 100,
      ref: { prop: "x", val: ({ w: o }) => i.width - o }
    }
  }, s = R("div");
  s.style.cssText = `
    position: absolute;
    z-index: 4;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    box-sizing: border-box;
  `;
  const a = Object.fromEntries(
    Object.entries(r).map(([o, { w: c, h: d, x: l, y: u }]) => {
      const p = R("div");
      return p.style.cssText = `
        ${n}
        border-${c > 0 ? "top" : "left"}: 1px solid #3ee;
        top: ${u}%; left: ${l}%;
        ${l === 100 ? "margin-left: -1px" : ""};
        ${u === 100 ? "margin-top: -1px" : ""};
        width: ${c}%; height: ${d}%;
      `, s.appendChild(p), [o, p];
    })
  );
  t.appendChild(s);
  const h = 6 / (900 / i.width);
  return {
    magneticEffect(o, c, d) {
      const l = { x: o, y: c }, u = { x: h, y: h }, p = { x: "", y: "" };
      Object.values(a).forEach((f) => f.style.display = "none");
      for (const f in r) {
        const { prop: w, val: b } = r[f].ref, m = b(d), T = Math.abs((w === "x" ? o : c) - m);
        T <= h && T < u[w] && (u[w] = T, l[w] = m, p[w] = f);
      }
      return p.x && (a[p.x].style.display = "block"), p.y && (a[p.y].style.display = "block"), l;
    },
    hide() {
      Object.values(a).forEach((o) => o.style.display = "none");
    },
    destroy() {
      s.remove();
    }
  };
}
const ft = {
  sampleRate: 48e3
};
function ut(i) {
  const t = R("canvas");
  return t.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
  `, t.width = i.width, t.height = i.height, t;
}
class St {
  #t;
  #e;
  #i;
  #s = false;
  #u = [];
  #w;
  #o = new M$1();
  on = this.#o.on;
  #m;
  /**
   * 预览帧生成中
   */
  #l = false;
  /**
   * 创建 `AVCanvas` 类的实例。
   * @param attchEl - 要添加画布的元素。
   * @param opts - 画布的选项
   * @param opts.bgColor - 画布的背景颜色。
   * @param opts.width - 画布的宽度。
   * @param opts.height - 画布的高度。
   */
  constructor(t, n) {
    this.#m = n, this.#t = ut(n);
    const e = this.#t.getContext("2d", { alpha: false });
    if (e == null) throw Error("canvas context is null");
    this.#i = e;
    const r = R("div");
    r.style.cssText = "width: 100%; height: 100%; position: relative;", r.appendChild(this.#t), t.appendChild(r), mt(this.#n).connect(this.#c), V(this.#t, { x: 0, y: 0, w: 0, h: 0 }), this.#e = new tt(), this.#u.push(
      // 鼠标样式、控制 sprite 依赖 activeSprite，
      // activeSprite 需要在他们之前监听到 mousedown 事件 (代码顺序需要靠前)
      rt(this.#t, this.#e),
      nt(r, this.#t, this.#e),
      st(this.#t, this.#e, r),
      this.#e.on(z.AddSprite, (c) => {
        const { rect: d } = c;
        d.x === 0 && d.y === 0 && (d.x = (this.#t.width - d.w) / 2, d.y = (this.#t.height - d.h) / 2);
      }),
      M$1.forwardEvent(this.#e, this.#o, [
        z.ActiveSpriteChange
      ])
    );
    let s = this.#a, a = performance.now(), h = 0;
    const o = 1e3 / 30;
    this.#w = _$1(() => {
      (performance.now() - a) / (o * h) < 1 || this.#l || (h += 1, this.#i.fillStyle = n.bgColor, this.#i.fillRect(0, 0, this.#t.width, this.#t.height), this.#b(), s !== this.#a && (s = this.#a, this.#o.emit("timeupdate", Math.round(s))));
    }, o);
  }
  #a = 0;
  #d(t) {
    this.#a = t, this.#e.updateRenderTime(t), this.#f.updateTime(t);
  }
  #p() {
    if (this.#r.step !== 0) {
      this.#r.step = 0, this.#o.emit("paused"), this.#n.suspend();
      for (const t of this.#h)
        t.stop(), t.disconnect();
      this.#h.clear(), this.#f.reset();
    }
  }
  #n = new AudioContext();
  #c = this.#n.createMediaStreamDestination();
  #h = /* @__PURE__ */ new Set();
  #b() {
    const t = this.#i;
    let n = this.#a;
    const { start: e, end: r, step: s, audioPlayAt: a } = this.#r;
    n += s, s !== 0 && n >= e && n < r ? this.#d(n) : this.#p();
    const h = [];
    for (const o of this.#e.getSprites()) {
      t.save();
      const { audio: c } = o.render(t, n - o.time.offset);
      t.restore(), h.push(c);
    }
    if (t.resetTransform(), s !== 0) {
      const o = Math.max(this.#n.currentTime, a), c = wt(
        h,
        this.#n
      );
      let d = 0;
      for (const l of c)
        l.start(o), l.connect(this.#n.destination), l.connect(this.#c), this.#h.add(l), l.onended = () => {
          l.disconnect(), this.#h.delete(l);
        }, d = Math.max(d, l.buffer?.duration ?? 0);
      this.#r.audioPlayAt = o + d;
    }
  }
  #r = {
    start: 0,
    end: 0,
    // paused state when step equal 0
    step: 0,
    // step: (1000 / 30) * 1000,
    audioPlayAt: 0
  };
  /**
   * 每 33ms 更新一次画布，绘制已添加的 Sprite
   * @param opts - 播放选项
   * @param opts.start - 开始播放的时间（单位：微秒）
   * @param [opts.end] - 结束播放的时间（单位：微秒）。如果未指定，则播放到最后一个 Sprite 的结束时间
   * @param [opts.playbackRate] - 播放速率。1 表示正常速度，2 表示两倍速度，0.5 表示半速等。如果未指定，则默认为 1
   * @throws 如果开始时间大于等于结束时间或小于 0，则抛出错误
   */
  play(t) {
    const n = this.#e.getSprites({ time: false }).map((r) => r.time.offset + r.time.duration), e = t.end ?? (n.length > 0 ? Math.max(...n) : 1 / 0);
    if (t.start >= e || t.start < 0)
      throw Error(
        `Invalid time parameter, ${JSON.stringify({ start: t.start, end: e })}`
      );
    this.#d(t.start), this.#f.reset(), this.#r.start = t.start, this.#r.end = e, this.#r.step = (t.playbackRate ?? 1) * (1e3 / 30) * 1e3, this.#n.resume(), this.#r.audioPlayAt = 0, this.#o.emit("playing"), S$1.info("AVCanvs play by:", this.#r);
  }
  #f = (() => {
    const t = /* @__PURE__ */ new Set();
    return {
      reset() {
        t.clear();
      },
      updateTime: te$1((n) => {
        const r = this.#e.getSprites({ time: false }).filter((s) => {
          const { offset: a } = s.time;
          return a > n && a - 1e6 <= n;
        });
        for (const s of r)
          t.has(s) || s.preFrame(0), t.add(s);
      }, 500)
    };
  })();
  /**
   * 暂停播放，画布内容不再更新
   */
  pause() {
    this.#p();
  }
  /**
   * 预览 `AVCanvas` 指定时间的图像帧
   */
  async previewFrame(t) {
    this.#p(), this.#d(t), this.#l = true;
    try {
      await Promise.all(
        this.#e.getSprites({ time: !1 }).map((n) => t >= n.time.offset && t <= n.time.offset + n.time.duration ? n.preFrame(t - n.time.offset) : null)
      );
    } finally {
      this.#l = false;
    }
  }
  /**
   * 获取当前帧的截图图像 返回的是一个base64
   */
  captureImage() {
    return this.#t.toDataURL();
  }
  get activeSprite() {
    return this.#e.activeSprite;
  }
  set activeSprite(t) {
    this.#e.activeSprite = t;
  }
  #y = /* @__PURE__ */ new WeakMap();
  /**
   * 添加 {@link VisibleSprite}
   * @param args {@link VisibleSprite}
   * @example
   * const sprite = new VisibleSprite(
   *   new ImgClip({
   *     type: 'image/gif',
   *     stream: (await fetch('https://xx.gif')).body!,
   *   }),
   * );
   */
  addSprite = async (t) => {
    this.#n.state === "suspended" && this.#n.resume().catch(S$1.error);
    const n = t.getClip();
    if (n instanceof rt$1 && n.audioTrack != null) {
      const e = this.#n.createMediaStreamSource(
        new MediaStream([n.audioTrack])
      );
      e.connect(this.#c), this.#y.set(t, e);
    }
    await this.#e.addSprite(t);
  };
  /**
   * 删除 {@link VisibleSprite}
   * @param args
   * @returns
   * @example
   * const sprite = new VisibleSprite();
   * avCvs.removeSprite(sprite);
   */
  removeSprite = (t) => {
    this.#y.get(t)?.disconnect(), this.#e.removeSprite(t);
  };
  /**
   * 销毁实例
   */
  destroy() {
    this.#s || (this.#s = true, this.#n.close(), this.#c.disconnect(), this.#o.destroy(), this.#w(), this.#t.parentElement?.remove(), this.#u.forEach((t) => t()), this.#h.clear(), this.#e.destroy());
  }
  /**
   * 合成所有素材的图像与音频，返回实时媒体流 `MediaStream`
   *
   * 可用于 WebRTC 推流，或由 {@link [AVRecorder](../../av-recorder/classes/AVRecorder.html)} 录制生成视频文件
   *
   * @see [直播录制](https://webav-tech.github.io/WebAV/demo/4_2-recorder-avcanvas)
   *
   */
  captureStream() {
    this.#n.state === "suspended" && this.#n.resume().catch(S$1.error);
    const t = new MediaStream(
      this.#t.captureStream().getTracks().concat(this.#c.stream.getTracks())
    );
    return S$1.info(
      "AVCanvas.captureStream, tracks:",
      t.getTracks().map((n) => n.kind)
    ), t;
  }
  /**
   * 创建一个视频合成器 {@link [Combinator](../../av-cliper/classes/Combinator.html)} 实例，用于将当前画布添加的 Sprite 导出为视频文件流
   *
   * @param opts - 创建 Combinator 的可选参数
   * @throws 如果没有添加素材，会抛出错误
   *
   * @example
   * avCvs.createCombinator().output() // => ReadableStream
   *
   * @see [视频剪辑](https://webav-tech.github.io/WebAV/demo/6_4-video-editor)
   */
  async createCombinator(t = {}) {
    S$1.info("AVCanvas.createCombinator, opts:", t);
    const n = new xe({ ...this.#m, ...t }), e = this.#e.getSprites({ time: false });
    if (e.length === 0) throw Error("No sprite added");
    for (const r of e) {
      const s = new ht$1(r.getClip());
      s.time = { ...r.time }, r.copyStateTo(s), await n.addSprite(s);
    }
    return n;
  }
}
function wt(i, t) {
  const n = [];
  if (i.length === 0) return n;
  for (const [e, r] of i) {
    if (e == null || e.length <= 0) continue;
    const s = t.createBuffer(
      2,
      e.length,
      ft.sampleRate
    );
    s.copyToChannel(e, 0), s.copyToChannel(r ?? e, 1);
    const a = t.createBufferSource();
    a.buffer = s, n.push(a);
  }
  return n;
}
function mt(i) {
  const t = i.createOscillator(), n = new Float32Array([0, 0]), e = new Float32Array([0, 0]), r = i.createPeriodicWave(n, e, {
    disableNormalization: true
  });
  return t.setPeriodicWave(r), t.start(), t;
}

export { A, I$1 as I, R$1 as R, St as S, avCliper as a, dt$1 as d, ye as y };
