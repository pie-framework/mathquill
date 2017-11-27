/*********************************
 * Symbols for Basic Mathematics
 ********************************/

var Digit = P(VanillaSymbol, function(_, super_) {
  _.createLeftOf = function(cursor) {
    if (cursor.options.autoSubscriptNumerals
        && cursor.parent !== cursor.parent.parent.sub
        && ((cursor[L] instanceof Variable && cursor[L].isItalic !== false)
            || (cursor[L] instanceof SupSub
                && cursor[L][L] instanceof Variable
                && cursor[L][L].isItalic !== false))) {
      LatexCmds._().createLeftOf(cursor);
      super_.createLeftOf.call(this, cursor);
      cursor.insRightOf(cursor.parent.parent);
    }
    else super_.createLeftOf.call(this, cursor);
  };
});

var Variable = P(Symbol, function(_, super_) {
  _.init = function(ch, html) {
    super_.init.call(this, ch, '<var>'+(html || ch)+'</var>');
  };
  _.text = function() {
    var text = this.ctrlSeq;
    if (this.isPartOfOperator) {
      if (text[0] == '\\') {
        text = text.slice(1, text.length);
      }
      else if (text[text.length-1] == ' ') {
        text = text.slice (0, -1);
      }
    } else {
      if (this[L] && !(this[L] instanceof Variable)
          && !(this[L] instanceof BinaryOperator)
          && this[L].ctrlSeq !== '\\ ')
        text = '*' + text;
      if (this[R] && !(this[R] instanceof BinaryOperator)
          && !(this[R] instanceof SupSub))
        text += '*';
    }
    return text;
  };
});

Options.p.autoCommands = { _maxLength: 0 };
optionProcessors.autoCommands = function(cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw 'autocommand "'+cmd+'" not minimum length of 2';
    }
    if (LatexCmds[cmd] === OperatorName) {
      throw '"' + cmd + '" is a built-in operator name';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
};

var Letter = P(Variable, function(_, super_) {
  _.init = function(ch) { return super_.init.call(this, this.letter = ch); };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    var autoCmds = cursor.options.autoCommands, maxLength = autoCmds._maxLength;
    if (maxLength > 0) {
      // want longest possible autocommand, so join together longest
      // sequence of letters
      var str = '', l = this, i = 0;
      // FIXME: l.ctrlSeq === l.letter checks if first or last in an operator name
      while (l instanceof Letter && l.ctrlSeq === l.letter && i < maxLength) {
        str = l.letter + str, l = l[L], i += 1;
      }
      // check for an autocommand, going thru substrings longest to shortest
      while (str.length) {
        if (autoCmds.hasOwnProperty(str)) {
          for (var i = 1, l = this; i < str.length; i += 1, l = l[L]);
          Fragment(l, this).remove();
          cursor[L] = l[L];
          return LatexCmds[str](str).createLeftOf(cursor);
        }
        str = str.slice(1);
      }
    }
  };
  _.italicize = function(bool) {
    this.isItalic = bool;
    this.isPartOfOperator = !bool;
    this.jQ.toggleClass('mq-operator-name', !bool);
    return this;
  };
  _.finalizeTree = _.siblingDeleted = _.siblingCreated = function(opts, dir) {
    // don't auto-un-italicize if the sibling to my right changed (dir === R or
    // undefined) and it's now a Letter, it will un-italicize everyone
    if (dir !== L && this[R] instanceof Letter) return;
    this.autoUnItalicize(opts);
  };
  _.autoUnItalicize = function(opts) {
    var autoOps = opts.autoOperatorNames;
    if (autoOps._maxLength === 0) return;
    // want longest possible operator names, so join together entire contiguous
    // sequence of letters
    var str = this.letter;
    for (var l = this[L]; l instanceof Letter; l = l[L]) str = l.letter + str;
    for (var r = this[R]; r instanceof Letter; r = r[R]) str += r.letter;

    // removeClass and delete flags from all letters before figuring out
    // which, if any, are part of an operator name
    Fragment(l[R] || this.parent.ends[L], r[L] || this.parent.ends[R]).each(function(el) {
      el.italicize(true).jQ.removeClass('mq-first mq-last mq-followed-by-supsub');
      el.ctrlSeq = el.letter;
    });

    // check for operator names: at each position from left to right, check
    // substrings from longest to shortest
    outer: for (var i = 0, first = l[R] || this.parent.ends[L]; i < str.length; i += 1, first = first[R]) {
      for (var len = min(autoOps._maxLength, str.length - i); len > 0; len -= 1) {
        var word = str.slice(i, i + len);
        if (autoOps.hasOwnProperty(word)) {
          for (var j = 0, letter = first; j < len; j += 1, letter = letter[R]) {
            letter.italicize(false);
            var last = letter;
          }

          var isBuiltIn = BuiltInOpNames.hasOwnProperty(word);
          first.ctrlSeq = (isBuiltIn ? '\\' : '\\operatorname{') + first.ctrlSeq;
          last.ctrlSeq += (isBuiltIn ? ' ' : '}');
          if (TwoWordOpNames.hasOwnProperty(word)) last[L][L][L].jQ.addClass('mq-last');
          if (!shouldOmitPadding(first[L])) first.jQ.addClass('mq-first');
          if (!shouldOmitPadding(last[R])) {
            if (last[R] instanceof SupSub) {
              var supsub = last[R]; // XXX monkey-patching, but what's the right thing here?
              // Have operatorname-specific code in SupSub? A CSS-like language to style the
              // math tree, but which ignores cursor and selection (which CSS can't)?
              var respace = supsub.siblingCreated = supsub.siblingDeleted = function() {
                supsub.jQ.toggleClass('mq-after-operator-name', !(supsub[R] instanceof Bracket));
              };
              respace();
            }
            else {
              last.jQ.toggleClass('mq-last', !(last[R] instanceof Bracket));
            }
          }

          i += len - 1;
          first = last;
          continue outer;
        }
      }
    }
  };
  function shouldOmitPadding(node) {
    // omit padding if no node, or if node already has padding (to avoid double-padding)
    return !node || (node instanceof BinaryOperator) || (node instanceof SummationNotation);
  }
});
var BuiltInOpNames = {}; // the set of operator names like \sin, \cos, etc that
  // are built-into LaTeX, see Section 3.17 of the Short Math Guide: http://tinyurl.com/jm9okjc
  // MathQuill auto-unitalicizes some operator names not in that set, like 'hcf'
  // and 'arsinh', which must be exported as \operatorname{hcf} and
  // \operatorname{arsinh}. Note: over/under line/arrow \lim variants like
  // \varlimsup are not supported
var AutoOpNames = Options.p.autoOperatorNames = { _maxLength: 9 }; // the set
  // of operator names that MathQuill auto-unitalicizes by default; overridable
var TwoWordOpNames = { limsup: 1, liminf: 1, projlim: 1, injlim: 1 };
(function() {
  var mostOps = ('arg deg det dim exp gcd hom inf ker lg ln log max min sup'
                 + ' limsup liminf injlim projlim Pr').split(' ');
  for (var i = 0; i < mostOps.length; i += 1) {
    BuiltInOpNames[mostOps[i]] = AutoOpNames[mostOps[i]] = 1;
  }

  var builtInTrigs = // why coth but not sech and csch, LaTeX?
    'sin cos tan arcsin arccos arctan sinh cosh tanh sec csc cot coth'.split(' ');
  for (var i = 0; i < builtInTrigs.length; i += 1) {
    BuiltInOpNames[builtInTrigs[i]] = 1;
  }

  var autoTrigs = 'sin cos tan sec cosec csc cotan cot ctg'.split(' ');
  for (var i = 0; i < autoTrigs.length; i += 1) {
    AutoOpNames[autoTrigs[i]] =
    AutoOpNames['arc'+autoTrigs[i]] =
    AutoOpNames[autoTrigs[i]+'h'] =
    AutoOpNames['ar'+autoTrigs[i]+'h'] =
    AutoOpNames['arc'+autoTrigs[i]+'h'] = 1;
  }

  // compat with some of the nonstandard LaTeX exported by MathQuill
  // before #247. None of these are real LaTeX commands so, seems safe
  var moreNonstandardOps = 'gcf hcf lcm proj span'.split(' ');
  for (var i = 0; i < moreNonstandardOps.length; i += 1) {
    AutoOpNames[moreNonstandardOps[i]] = 1;
  }
}());
optionProcessors.autoOperatorNames = function(cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw '"'+cmd+'" not minimum length of 2';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
};
var OperatorName = P(Symbol, function(_, super_) {
  _.init = function(fn) { this.ctrlSeq = fn; };
  _.createLeftOf = function(cursor) {
    var fn = this.ctrlSeq;
    for (var i = 0; i < fn.length; i += 1) {
      Letter(fn.charAt(i)).createLeftOf(cursor);
    }
  };
  _.parser = function() {
    var fn = this.ctrlSeq;
    var block = MathBlock();
    for (var i = 0; i < fn.length; i += 1) {
      Letter(fn.charAt(i)).adopt(block, block.ends[R], 0);
    }
    return Parser.succeed(block.children());
  };
});
for (var fn in AutoOpNames) if (AutoOpNames.hasOwnProperty(fn)) {
  LatexCmds[fn] = OperatorName;
}
LatexCmds.operatorname = P(MathCommand, function(_) {
  _.createLeftOf = noop;
  _.numBlocks = function() { return 1; };
  _.parser = function() {
    return latexMathParser.block.map(function(b) { return b.children(); });
  };
});

LatexCmds.f = P(Letter, function(_, super_) {
  _.init = function() {
    Symbol.p.init.call(this, this.letter = 'f', '<var class="mq-f">f</var>');
  };
  _.italicize = function(bool) {
    this.jQ.html('f').toggleClass('mq-f', bool);
    return super_.italicize.apply(this, arguments);
  };
});

// VanillaSymbol's
LatexCmds[' '] = LatexCmds.space = bind(VanillaSymbol, '\\ ', '&nbsp;');

LatexCmds["'"] = LatexCmds.prime = bind(VanillaSymbol, "'", '&prime;');
LatexCmds['″'] = LatexCmds.dprime = bind(VanillaSymbol, '″', '&Prime;');
LatexCmds['"'] = LatexCmds.doublePrime = bind(VanillaSymbol, '"', '&Prime;');

LatexCmds.backslash = bind(VanillaSymbol,'\\backslash ','\\');
if (!CharCmds['\\']) CharCmds['\\'] = LatexCmds.backslash;

LatexCmds.$ = bind(VanillaSymbol, '\\$', '$');

// does not use Symbola font
var NonSymbolaSymbol = P(Symbol, function(_, super_) {
  _.init = function(ch, html) {
    super_.init.call(this, ch, '<span class="mq-nonSymbola">'+(html || ch)+'</span>');
  };
});

LatexCmds['@'] = NonSymbolaSymbol;
LatexCmds['&'] = bind(NonSymbolaSymbol, '\\&', '&amp;');
LatexCmds['%'] = bind(NonSymbolaSymbol, '\\%', '%');

//the following are all Greek to me, but this helped a lot: http://www.ams.org/STIX/ion/stixsig03.html

//lowercase Greek letter variables
LatexCmds.alpha =
LatexCmds.beta =
LatexCmds.gamma =
LatexCmds.delta =
LatexCmds.zeta =
LatexCmds.eta =
LatexCmds.theta =
LatexCmds.iota =
LatexCmds.kappa =
LatexCmds.mu =
LatexCmds.nu =
LatexCmds.xi =
LatexCmds.rho =
LatexCmds.sigma =
LatexCmds.tau =
LatexCmds.chi =
LatexCmds.psi =
LatexCmds.omega = P(Variable, function(_, super_) {
  _.init = function(latex) {
    super_.init.call(this,'\\'+latex+' ','&'+latex+';');
  };
});

//why can't anybody FUCKING agree on these
LatexCmds.phi = //W3C or Unicode?
  bind(Variable,'\\phi ','&#981;');

LatexCmds.phiv = //Elsevier and 9573-13
LatexCmds.varphi = //AMS and LaTeX
  bind(Variable,'\\varphi ','&phi;');

LatexCmds.epsilon = //W3C or Unicode?
  bind(Variable,'\\epsilon ','&#1013;');

LatexCmds.epsiv = //Elsevier and 9573-13
LatexCmds.varepsilon = //AMS and LaTeX
  bind(Variable,'\\varepsilon ','&epsilon;');

LatexCmds.piv = //W3C/Unicode and Elsevier and 9573-13
LatexCmds.varpi = //AMS and LaTeX
  bind(Variable,'\\varpi ','&piv;');

LatexCmds.sigmaf = //W3C/Unicode
LatexCmds.sigmav = //Elsevier
LatexCmds.varsigma = //LaTeX
  bind(Variable,'\\varsigma ','&sigmaf;');

LatexCmds.thetav = //Elsevier and 9573-13
LatexCmds.vartheta = //AMS and LaTeX
LatexCmds.thetasym = //W3C/Unicode
  bind(Variable,'\\vartheta ','&thetasym;');

LatexCmds.upsilon = //AMS and LaTeX and W3C/Unicode
LatexCmds.upsi = //Elsevier and 9573-13
  bind(Variable,'\\upsilon ','&upsilon;');

//these aren't even mentioned in the HTML character entity references
LatexCmds.gammad = //Elsevier
LatexCmds.Gammad = //9573-13 -- WTF, right? I dunno if this was a typo in the reference (see above)
LatexCmds.digamma = //LaTeX
  bind(Variable,'\\digamma ','&#989;');

LatexCmds.kappav = //Elsevier
LatexCmds.varkappa = //AMS and LaTeX
  bind(Variable,'\\varkappa ','&#1008;');

LatexCmds.rhov = //Elsevier and 9573-13
LatexCmds.varrho = //AMS and LaTeX
  bind(Variable,'\\varrho ','&#1009;');

//Greek constants, look best in non-italicized Times New Roman
LatexCmds.pi = LatexCmds['π'] = bind(NonSymbolaSymbol,'\\pi ','&pi;');
LatexCmds.lambda = bind(NonSymbolaSymbol,'\\lambda ','&lambda;');

//uppercase greek letters

LatexCmds.Upsilon = //LaTeX
LatexCmds.Upsi = //Elsevier and 9573-13
LatexCmds.upsih = //W3C/Unicode "upsilon with hook"
LatexCmds.Upsih = //'cos it makes sense to me
  bind(Symbol,'\\Upsilon ','<var style="font-family: serif">&upsih;</var>'); //Symbola's 'upsilon with a hook' is a capital Y without hooks :(

//other symbols with the same LaTeX command and HTML character entity reference
LatexCmds.Gamma =
LatexCmds.Delta =
LatexCmds.Theta =
LatexCmds.Lambda =
LatexCmds.Xi =
LatexCmds.Pi =
LatexCmds.Sigma =
LatexCmds.Phi =
LatexCmds.Psi =
LatexCmds.Omega = P(VanillaSymbol, function(_, super_) {
  _.init = function(latex) {
    super_.init.call(this,'\\'+latex+' ','&'+latex+';');
  };
});

LatexCmds.forall = LatexCmds['∀'] = bind(VanillaSymbol,'\\forall ','&#8704;');

// symbols that aren't a single MathCommand, but are instead a whole
// Fragment. Creates the Fragment from a LaTeX string
var LatexFragment = P(MathCommand, function(_) {
  _.init = function(latex) { this.latex = latex; };
  _.createLeftOf = function(cursor) {
    var block = latexMathParser.parse(this.latex);
    block.children().adopt(cursor.parent, cursor[L], cursor[R]);
    cursor[L] = block.ends[R];
    block.jQize().insertBefore(cursor.jQ);
    block.finalizeInsert(cursor.options, cursor);
    if (block.ends[R][R].siblingCreated) block.ends[R][R].siblingCreated(cursor.options, L);
    if (block.ends[L][L].siblingCreated) block.ends[L][L].siblingCreated(cursor.options, R);
    cursor.parent.bubble('reflow');
  };
  _.parser = function() {
    var frag = latexMathParser.parse(this.latex).children();
    return Parser.succeed(frag);
  };
});

// for what seems to me like [stupid reasons][1], Unicode provides
// subscripted and superscripted versions of all ten Arabic numerals,
// as well as [so-called "vulgar fractions"][2].
// Nobody really cares about most of them, but some of them actually
// predate Unicode, dating back to [ISO-8859-1][3], apparently also
// known as "Latin-1", which among other things [Windows-1252][4]
// largely coincides with, so Microsoft Word sometimes inserts them
// and they get copy-pasted into MathQuill.
//
// (Irrelevant but funny story: though not a superset of Latin-1 aka
// ISO-8859-1, Windows-1252 **is** a strict superset of the "closely
// related but distinct"[3] "ISO 8859-1" -- see the lack of a dash
// after "ISO"? Completely different character set, like elephants vs
// elephant seals, or "Zombies" vs "Zombie Redneck Torture Family".
// What kind of idiot would get them confused.
// People in fact got them confused so much, it was so common to
// mislabel Windows-1252 text as ISO-8859-1, that most modern web
// browsers and email clients treat the MIME charset of ISO-8859-1
// as actually Windows-1252, behavior now standard in the HTML5 spec.)
//
// [1]: http://en.wikipedia.org/wiki/Unicode_subscripts_andsuper_scripts
// [2]: http://en.wikipedia.org/wiki/Number_Forms
// [3]: http://en.wikipedia.org/wiki/ISO/IEC_8859-1
// [4]: http://en.wikipedia.org/wiki/Windows-1252
LatexCmds['¹'] = bind(LatexFragment, '^1');
LatexCmds['²'] = bind(LatexFragment, '^2');
LatexCmds['³'] = bind(LatexFragment, '^3');
LatexCmds['¼'] = bind(LatexFragment, '\\frac14');
LatexCmds['½'] = bind(LatexFragment, '\\frac12');
LatexCmds['¾'] = bind(LatexFragment, '\\frac34');

var PlusMinus = P(BinaryOperator, function(_) {
  _.init = VanillaSymbol.prototype.init;

  _.contactWeld = _.siblingCreated = _.siblingDeleted = function(opts, dir) {
    function determineOpClassType(node) {
      if (node[L]) {
        // If the left sibling is a binary operator or a separator (comma, semicolon, colon)
        // or an open bracket (open parenthesis, open square bracket)
        // consider the operator to be unary
        if (node[L] instanceof BinaryOperator || /^[,;:\(\[]$/.test(node[L].ctrlSeq)) {
          return '';
        }
      } else if (node.parent && node.parent.parent && node.parent.parent.isStyleBlock()) {
        //if we are in a style block at the leftmost edge, determine unary/binary based on
        //the style block
        //this allows style blocks to be transparent for unary/binary purposes
        return determineOpClassType(node.parent.parent);
      } else {
        return '';
      }

      return 'mq-binary-operator';
    };

    if (dir === R) return; // ignore if sibling only changed on the right
    this.jQ[0].className = determineOpClassType(this);
    return this;
  };
});

LatexCmds['+'] = bind(PlusMinus, '+', '+');
//yes, these are different dashes, I think one is an en dash and the other is a hyphen
LatexCmds['–'] = LatexCmds['-'] = bind(PlusMinus, '-', '&minus;');
LatexCmds['±'] = LatexCmds.pm = LatexCmds.plusmn = LatexCmds.plusminus =
  bind(PlusMinus,'\\pm ','&plusmn;');
LatexCmds.mp = LatexCmds.mnplus = LatexCmds.minusplus =
  bind(PlusMinus,'\\mp ','&#8723;');

CharCmds['*'] = LatexCmds.sdot = LatexCmds.cdot =
  bind(BinaryOperator, '\\cdot ', '&middot;', '*');
//semantically should be &sdot;, but &middot; looks better

var Inequality = P(BinaryOperator, function(_, super_) {
  _.init = function(data, strict) {
    this.data = data;
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    super_.init.call(this, data['ctrlSeq'+strictness], data['html'+strictness],
                     data['text'+strictness]);
  };
  _.swap = function(strict) {
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    this.ctrlSeq = this.data['ctrlSeq'+strictness];
    this.jQ.html(this.data['html'+strictness]);
    this.textTemplate = [ this.data['text'+strictness] ];
  };
  _.deleteTowards = function(dir, cursor) {
    if (dir === L && !this.strict) {
      this.swap(true);
      this.bubble('reflow');
      return;
    }
    super_.deleteTowards.apply(this, arguments);
  };
});

var less = { ctrlSeq: '\\le ', html: '&le;', text: '≤',
             ctrlSeqStrict: '<', htmlStrict: '&lt;', textStrict: '<' };
var greater = { ctrlSeq: '\\ge ', html: '&ge;', text: '≥',
                ctrlSeqStrict: '>', htmlStrict: '&gt;', textStrict: '>' };

LatexCmds['<'] = LatexCmds.lt = bind(Inequality, less, true);
LatexCmds['>'] = LatexCmds.gt = bind(Inequality, greater, true);
LatexCmds['≤'] = LatexCmds.le = LatexCmds.leq = bind(Inequality, less, false);
LatexCmds['≥'] = LatexCmds.ge = LatexCmds.geq = bind(Inequality, greater, false);

var Equality = P(BinaryOperator, function(_, super_) {
  _.init = function() {
    super_.init.call(this, '=', '=');
  };
  _.createLeftOf = function(cursor) {
    if (cursor[L] instanceof Inequality && cursor[L].strict) {
      cursor[L].swap(false);
      cursor[L].bubble('reflow');
      return;
    }
    super_.createLeftOf.apply(this, arguments);
  };
});
LatexCmds['='] = Equality;

LatexCmds['×'] = LatexCmds.times = bind(BinaryOperator, '\\times ', '&times;', '[x]');

LatexCmds['÷'] = LatexCmds.div = LatexCmds.divide = LatexCmds.divides =
  bind(BinaryOperator,'\\div ','&divide;', '[/]');

CharCmds['~'] = LatexCmds.sim = bind(BinaryOperator, '\\sim ', '~', '~');
CharCmds['\u2241'] = LatexCmds.nsim = bind(BinaryOperator, '\\nsim ', '\u2241', '\u2241');


// New VanillaSymbols
LatexCmds.complement = LatexCmds['∁'] = bind(VanillaSymbol, '\\complement ', '&#8705;');
LatexCmds.nexists = LatexCmds['∄'] = bind(VanillaSymbol, '\\nexists ', '&#8708;');
LatexCmds.sphericalangle = LatexCmds['∢'] = bind(VanillaSymbol, '\\sphericalangle ', '&#8738;');
LatexCmds.iint = LatexCmds['∬'] = bind(VanillaSymbol, '\\iint ', '&#8748;');
LatexCmds.iiint = LatexCmds['∭'] = bind(VanillaSymbol, '\\iiint ', '&#8749;');
LatexCmds.oiint = LatexCmds['∯'] = bind(VanillaSymbol, '\\oiint ', '&#8751;');
LatexCmds.oiiint = LatexCmds['∰'] = bind(VanillaSymbol, '\\oiiint ', '&#8752;');
LatexCmds.backsim = LatexCmds['∽'] = bind(VanillaSymbol, '\\backsim ', '&#8765;');
LatexCmds.backsimeq = LatexCmds['⋍'] = bind(VanillaSymbol, '\\backsimeq ', '&#8909;');
LatexCmds.eqsim = LatexCmds['≂'] = bind(VanillaSymbol, '\\eqsim ', '&#8770;');
LatexCmds.ncong = LatexCmds['≇'] = bind(VanillaSymbol, '\\ncong ', '&#8775;');
LatexCmds.approxeq = LatexCmds['≊'] = bind(VanillaSymbol, '\\approxeq ', '&#8778;');
LatexCmds.bumpeq = LatexCmds['≏'] = bind(VanillaSymbol, '\\bumpeq ', '&#8783;');
LatexCmds.Bumpeq = LatexCmds['≎'] = bind(VanillaSymbol, '\\Bumpeq ', '&#8782;');
LatexCmds.doteqdot = LatexCmds['≑'] = bind(VanillaSymbol, '\\doteqdot ', '&#8785;');
LatexCmds.fallingdotseq = LatexCmds['≒'] = bind(VanillaSymbol, '\\fallingdotseq ', '&#8786;');
LatexCmds.risingdotseq = LatexCmds['≓'] = bind(VanillaSymbol, '\\risingdotseq ', '&#8787;');
LatexCmds.eqcirc = LatexCmds['≖'] = bind(VanillaSymbol, '\\eqcirc ', '&#8790;');
LatexCmds.circeq = LatexCmds['≗'] = bind(VanillaSymbol, '\\circeq ', '&#8791;');
LatexCmds.triangleq = LatexCmds['≜'] = bind(VanillaSymbol, '\\triangleq ', '&#8796;');
LatexCmds.leqq = LatexCmds['≦'] = bind(VanillaSymbol, '\\leqq ', '&#8806;');
LatexCmds.geqq = LatexCmds['≧'] = bind(VanillaSymbol, '\\geqq ', '&#8807;');
LatexCmds.lneqq = LatexCmds['≨'] = bind(VanillaSymbol, '\\lneqq ', '&#8808;');
LatexCmds.gneqq = LatexCmds['≩'] = bind(VanillaSymbol, '\\gneqq ', '&#8809;');
LatexCmds.between = LatexCmds['≬'] = bind(VanillaSymbol, '\\between ', '&#8812;');
LatexCmds.nleq = LatexCmds['≰'] = bind(VanillaSymbol, '\\nleq ', '&#8816;');
LatexCmds.ngeq = LatexCmds['≱'] = bind(VanillaSymbol, '\\ngeq ', '&#8817;');
LatexCmds.lesssim = LatexCmds['≲'] = bind(VanillaSymbol, '\\lesssim ', '&#8818;');
LatexCmds.gtrsim = LatexCmds['≳'] = bind(VanillaSymbol, '\\gtrsim ', '&#8819;');
LatexCmds.lessgtr = LatexCmds['≶'] = bind(VanillaSymbol, '\\lessgtr ', '&#8822;');
LatexCmds.gtrless = LatexCmds['≷'] = bind(VanillaSymbol, '\\gtrless ', '&#8823;');
LatexCmds.preccurlyeq = LatexCmds['≼'] = bind(VanillaSymbol, '\\preccurlyeq ', '&#8828;');
LatexCmds.succcurlyeq = LatexCmds['≽'] = bind(VanillaSymbol, '\\succcurlyeq ', '&#8829;');
LatexCmds.precsim = LatexCmds['≾'] = bind(VanillaSymbol, '\\precsim ', '&#8830;');
LatexCmds.succsim = LatexCmds['≿'] = bind(VanillaSymbol, '\\succsim ', '&#8831;');
LatexCmds.nprec = LatexCmds['⊀'] = bind(VanillaSymbol, '\\nprec ', '&#8832;');
LatexCmds.nsucc = LatexCmds['⊁'] = bind(VanillaSymbol, '\\nsucc ', '&#8833;');
LatexCmds.subsetneq = LatexCmds['⊊'] = bind(VanillaSymbol, '\\subsetneq ', '&#8842;');
LatexCmds.supsetneq = LatexCmds['⊋'] = bind(VanillaSymbol, '\\supsetneq ', '&#8843;');
LatexCmds.vDash = LatexCmds['⊨'] = bind(VanillaSymbol, '\\vDash ', '&#8872;');
LatexCmds.Vdash = LatexCmds['⊩'] = bind(VanillaSymbol, '\\Vdash ', '&#8873;');
LatexCmds.Vvdash = LatexCmds['⊪'] = bind(VanillaSymbol, '\\Vvdash ', '&#8874;');
LatexCmds.VDash = LatexCmds['⊫'] = bind(VanillaSymbol, '\\VDash ', '&#8875;');
LatexCmds.nvdash = LatexCmds['⊬'] = bind(VanillaSymbol, '\\nvdash ', '&#8876;');
LatexCmds.nvDash = LatexCmds['⊭'] = bind(VanillaSymbol, '\\nvDash ', '&#8877;');
LatexCmds.nVdash = LatexCmds['⊮'] = bind(VanillaSymbol, '\\nVdash ', '&#8878;');
LatexCmds.nVDash = LatexCmds['⊯'] = bind(VanillaSymbol, '\\nVDash ', '&#8879;');
LatexCmds.vartriangleleft = LatexCmds['⊲'] = bind(VanillaSymbol, '\\vartriangleleft ', '&#8882;');
LatexCmds.vartriangleright = LatexCmds['⊳'] = bind(VanillaSymbol, '\\vartriangleright ', '&#8883;');
LatexCmds.trianglelefteq = LatexCmds['⊴'] = bind(VanillaSymbol, '\\trianglelefteq ', '&#8884;');
LatexCmds.trianglerighteq = LatexCmds['⊵'] = bind(VanillaSymbol, '\\trianglerighteq ', '&#8885;');
LatexCmds.multimap = LatexCmds['⊸'] = bind(VanillaSymbol, '\\multimap ', '&#8888;');
LatexCmds.Subset = LatexCmds['⋐'] = bind(VanillaSymbol, '\\Subset ', '&#8912;');
LatexCmds.Supset = LatexCmds['⋑'] = bind(VanillaSymbol, '\\Supset ', '&#8913;');
LatexCmds.Cap = LatexCmds['⋒'] = bind(VanillaSymbol, '\\Cap ', '&#8914;');
LatexCmds.Cup = LatexCmds['⋓'] = bind(VanillaSymbol, '\\Cup ', '&#8915;');
LatexCmds.pitchfork = LatexCmds['⋔'] = bind(VanillaSymbol, '\\pitchfork ', '&#8916;');
LatexCmds.lessdot = LatexCmds['⋖'] = bind(VanillaSymbol, '\\lessdot ', '&#8918;');
LatexCmds.gtrdot = LatexCmds['⋗'] = bind(VanillaSymbol, '\\gtrdot ', '&#8919;');
LatexCmds.lll = LatexCmds['⋘'] = bind(VanillaSymbol, '\\lll ', '&#8920;');
LatexCmds.ggg = LatexCmds['⋙'] = bind(VanillaSymbol, '\\ggg ', '&#8921;');
LatexCmds.lesseqgtr = LatexCmds['⋚'] = bind(VanillaSymbol, '\\lesseqgtr ', '&#8922;');
LatexCmds.gtreqless = LatexCmds['⋛'] = bind(VanillaSymbol, '\\gtreqless ', '&#8923;');
LatexCmds.curlyeqprec = LatexCmds['⋞'] = bind(VanillaSymbol, '\\curlyeqprec ', '&#8926;');
LatexCmds.curlyeqsucc = LatexCmds['⋟'] = bind(VanillaSymbol, '\\curlyeqsucc ', '&#8927;');
LatexCmds.nsim = LatexCmds['≁'] = bind(VanillaSymbol, '\\nsim ', '&#8769;');
LatexCmds.lnsim = LatexCmds['⋦'] = bind(VanillaSymbol, '\\lnsim ', '&#8934;');
LatexCmds.gnsim = LatexCmds['⋧'] = bind(VanillaSymbol, '\\gnsim ', '&#8935;');
LatexCmds.precnsim = LatexCmds['⋨'] = bind(VanillaSymbol, '\\precnsim ', '&#8936;');
LatexCmds.succnsim = LatexCmds['⋩'] = bind(VanillaSymbol, '\\succnsim ', '&#8937;');
LatexCmds.ntriangleleft = LatexCmds['⋪'] = bind(VanillaSymbol, '\\ntriangleleft ', '&#8938;');
LatexCmds.ntriangleright = LatexCmds['⋫'] = bind(VanillaSymbol, '\\ntriangleright ', '&#8939;');
LatexCmds.ntrianglelefteq = LatexCmds['⋬'] = bind(VanillaSymbol, '\\ntrianglelefteq ', '&#8940;');
LatexCmds.ntrianglerighteq = LatexCmds['⋭'] = bind(VanillaSymbol, '\\ntrianglerighteq ', '&#8941;');
LatexCmds.blacksquare = LatexCmds['∎'] = bind(VanillaSymbol, '\\blacksquare ', '&#8718;');
LatexCmds.colon = LatexCmds['∶'] = bind(VanillaSymbol, '\\colon ', '&#8758;');
LatexCmds.llcorner = LatexCmds['∟'] = bind(VanillaSymbol, '\\llcorner ', '&#8735;');

// New BinaryOperators
LatexCmds.dotplus = LatexCmds['∔'] = bind(BinaryOperator, '\\dotplus ', '&#8724;');
LatexCmds.nmid = LatexCmds['∤'] = bind(BinaryOperator,'\nmid ','&#8740;');
LatexCmds.intercal = LatexCmds['⊺'] = bind(BinaryOperator, '\\intercal ', '&#8890;');
LatexCmds.veebar = LatexCmds['⊻'] = bind(BinaryOperator, '\\veebar ', '&#8891;');
LatexCmds.barwedge = LatexCmds['⊼'] = bind(BinaryOperator, '\\barwedge ', '&#8892;');
LatexCmds.ltimes = LatexCmds['⋉'] = bind(BinaryOperator, '\\ltimes ', '&#8905;');
LatexCmds.rtimes = LatexCmds['⋊'] = bind(BinaryOperator, '\\rtimes ', '&#8906;');
LatexCmds.leftthreetimes = LatexCmds['⋋'] = bind(BinaryOperator, '\\leftthreetimes ', '&#8907;');
LatexCmds.rightthreetimes = LatexCmds['⋌'] = bind(BinaryOperator, '\\rightthreetimes ', '&#8908;');
LatexCmds.curlyvee = LatexCmds['⋎'] = bind(BinaryOperator, '\\curlyvee ', '&#8910;');
LatexCmds.curlywedge = LatexCmds['⋏'] = bind(BinaryOperator, '\\curlywedge ', '&#8911;');
LatexCmds.circledcirc = LatexCmds['⊚'] = bind(BinaryOperator, '\\circledcirc ', '&#8858;');
LatexCmds.circledast = LatexCmds['⊛'] = bind(BinaryOperator, '\\circledast ', '&#8859;');
LatexCmds.circleddash = LatexCmds['⊝'] = bind(BinaryOperator, '\\circleddash ', '&#8861;');
LatexCmds.boxplus = LatexCmds['⊞'] = bind(BinaryOperator, '\\boxplus ', '&#8862;');
LatexCmds.boxminus = LatexCmds['⊟'] = bind(BinaryOperator, '\\boxminus ', '&#8863;');
LatexCmds.boxtimes = LatexCmds['⊠'] = bind(BinaryOperator, '\\boxtimes ', '&#8864;');
LatexCmds.boxdot = LatexCmds['⊡'] = bind(BinaryOperator, '\\boxdot ', '&#8865;');

// New mappings to existing symbols
LatexCmds['∂'] = LatexCmds.partial;
LatexCmds['∃'] = LatexCmds.exists;
LatexCmds['∅'] = LatexCmds.varnothing;
LatexCmds['∆'] = LatexCmds.triangle;
LatexCmds['∇'] = LatexCmds.nabla;
LatexCmds['∈'] = LatexCmds.in;
LatexCmds['∊'] = LatexCmds.in;
LatexCmds['∋'] = LatexCmds.ni;
LatexCmds['∌'] = LatexCmds.notni;
LatexCmds['∍'] = LatexCmds.ni;
LatexCmds['∐'] = LatexCmds.amalg;
LatexCmds['−'] = LatexCmds['-'];
LatexCmds['∓'] = LatexCmds.mp;
LatexCmds['∖'] = LatexCmds.setminus;
LatexCmds['∘'] = LatexCmds.circ;
LatexCmds['∙'] = LatexCmds.bullet;
LatexCmds['∝'] = LatexCmds.propto;
LatexCmds['∞'] = LatexCmds.infty;
LatexCmds['∠'] = LatexCmds.angle;
LatexCmds['∡'] = LatexCmds.measuredangle;
LatexCmds['∣'] = LatexCmds.divides;
LatexCmds['∥'] = LatexCmds.parallel;
LatexCmds['∦'] = LatexCmds.nparallel;
LatexCmds['∧'] = LatexCmds.wedge;
LatexCmds['∨'] = LatexCmds.vee;
LatexCmds['∩'] = LatexCmds.cap;
LatexCmds['∪'] = LatexCmds.cup;
LatexCmds['∮'] = LatexCmds.oint;
LatexCmds['∴'] = LatexCmds.therefore;
LatexCmds['∵'] = LatexCmds.because;
LatexCmds['∼'] = LatexCmds.sim;
LatexCmds['≀'] = LatexCmds.wr;
LatexCmds['≃'] = LatexCmds.simeq;
LatexCmds['≍'] = LatexCmds.asymp;
LatexCmds['≐'] = LatexCmds.doteq;
LatexCmds['≪'] = LatexCmds.ll;
LatexCmds['≫'] = LatexCmds.gg;
LatexCmds['≺'] = LatexCmds.prec;
LatexCmds['≻'] = LatexCmds.succ;
LatexCmds['⊂'] = LatexCmds.subset;
LatexCmds['⊃'] = LatexCmds.supset;
LatexCmds['⊆'] = LatexCmds.subseteq;
LatexCmds['⊇'] = LatexCmds.supseteq;
LatexCmds['⊈'] = LatexCmds.nsubseteq;
LatexCmds['⊉'] = LatexCmds.nsupseteq;
LatexCmds['⊏'] = LatexCmds.sqsubset;
LatexCmds['⊐'] = LatexCmds.sqsupset;
LatexCmds['⊓'] = LatexCmds.sqcap;
LatexCmds['⊔'] = LatexCmds.sqcup;
LatexCmds['⊖'] = LatexCmds.ominus;
LatexCmds['⊘'] = LatexCmds.oslash;
LatexCmds['⊙'] = LatexCmds.odot;
LatexCmds['⊢'] = LatexCmds.vdash;
LatexCmds['⊣'] = LatexCmds.dashv;
LatexCmds['⊤'] = LatexCmds.top;
LatexCmds['⊥'] = LatexCmds.bot;
LatexCmds['⊧'] = LatexCmds.models;
LatexCmds['⋀'] = LatexCmds.wedge;
LatexCmds['⋁'] = LatexCmds.vee;
LatexCmds['⋂'] = LatexCmds.cap;
LatexCmds['⋃'] = LatexCmds.cup;
LatexCmds['⋄'] = LatexCmds.diamond;
LatexCmds['⋅'] = LatexCmds.cdot;
LatexCmds['⋆'] = LatexCmds.star;
LatexCmds['⋈'] = LatexCmds.bowtie;
LatexCmds['⋮'] = LatexCmds.vdots;
LatexCmds['⋯'] = LatexCmds.cdots;
LatexCmds['⋱'] = LatexCmds.ddots;
