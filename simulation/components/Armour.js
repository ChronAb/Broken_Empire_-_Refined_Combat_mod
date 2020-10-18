function Armour() {}

Armour.prototype.Schema =
	"<a:help>Controls the damage resistance of the unit.</a:help>" +
	"<a:example>" +
		"<Hack>10.0</Hack>" +
		"<Pierce>0.0</Pierce>" +
		"<Crush>5.0</Crush>" +
	"</a:example>" +
	DamageTypes.BuildSchema("damage protection") +
	"<optional>" +
		"<element name='Foundation' a:help='Armour given to building foundations'>" +
			"<interleave>" +
				DamageTypes.BuildSchema("damage protection") +
			"</interleave>" +
		"</element>" +
	"</optional>";

Armour.prototype.Init = function()
{
	this.invulnerable = false;
};

Armour.prototype.IsInvulnerable = function()
{
	return this.invulnerable;
};

Armour.prototype.SetInvulnerability = function(invulnerability)
{
	this.invulnerable = invulnerability;
	Engine.PostMessage(this.entity, MT_InvulnerabilityChanged, { "entity": this.entity, "invulnerability": invulnerability });
};

/**
 * Take damage according to the entity's armor.
 * @param {Object} strengths - { "hack": number, "pierce": number, "crush": number } or something like that.
 * @param {number} multiplier - the damage multiplier.
 * Returns object of the form { "killed": false, "change": -12 }.
 */
Armour.prototype.TakeDamage = function(strengths, multiplier = 1)
{
	if (this.invulnerable)
		return { "killed": false, "change": 0 };

	// Adjust damage values based on armour; exponential armour: damage = attack * 0.9^armour
	var armourStrengths = this.GetArmourStrengths();

	// Total is sum of individual damages
	// Don't bother rounding, since HP is no longer integral.
	var total = 0;
	for (let type in strengths){
        let fraction = Math.pow(0.9, armourStrengths[type] || 0);
        if (randBool(fraction)){
            total += strengths[type] * multiplier * (0.75 + 0.25 * fraction);
        } else { total += strengths[type] * multiplier * 0.25 * fraction;}
    }
    
    //Modify according to Critical Hit System
	var dammage = total;
    if (total >= 60){
        dammage = total - 50 + randBool(0.2) * 250;
    }
    else if (total > 10){
        dammage = 10 + 5 * randBool(0.2) * (total-10);
    }

	// Reduce health
	var cmpHealth = Engine.QueryInterface(this.entity, IID_Health);
	return cmpHealth.Reduce(dammage);
};

Armour.prototype.GetArmourStrengths = function()
{
	// Work out the armour values with technology effects
	var applyMods = (type, foundation) => {
		var strength;
		if (foundation)
		{
			strength = +this.template.Foundation[type];
			type = "Foundation/" + type;
		}
		else
			strength = +this.template[type];

		return ApplyValueModificationsToEntity("Armour/" + type, strength, this.entity);
	};

	var foundation = Engine.QueryInterface(this.entity, IID_Foundation) && this.template.Foundation;

	let ret = {};
	for (let damageType of DamageTypes.GetTypes())
		ret[damageType] = applyMods(damageType, foundation);

	return ret;
};

Engine.RegisterComponentType(IID_DamageReceiver, "Armour", Armour);
