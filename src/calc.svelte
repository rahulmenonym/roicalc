<script>
    let no_hrp = 5;
    let qpw = 20;
	  let tpq = 30; 
		
		$: mpw = no_hrp * qpw * tpq;
		$: hpw = mpw/60

		$: hpwr = Math.round(hpw) 
		
</script>

<div class="flex">

    <h1>
        Bumblebee ROI
    </h1>

    <div class="item">
        <label for="">Number of HR Professionals</label>
        <input type="number" bind:value={no_hrp} placeholder="5" inputmode="numeric">
        <input type=range bind:value={no_hrp} min=1 max=50 step=1>
        <br><br>
        <label for="">Average number of queries each HR professional gets a week</label>
        <input type="number" bind:value={qpw} placeholder="20" inputmode="numeric">
        <input type=range bind:value={qpw} min=0 max=100 step=5>
			<label for="">Average time per query (in minutes)</label>
        <input type="number" bind:value={tpq} placeholder="30" inputmode="numeric">
        <input type=range bind:value={tpq} min=0 max=180 step=5>
        <br>
       
    </div>
	<br>
	{#if ((no_hrp && qpw && tpq) && (hpw>1 && hpw<1.5))}
		<div>
			You could be saving <b>{hpwr} hour</b> a week
		</div>
	{:else if ((no_hrp && qpw && tpq)&& hpw >= 1.5)}
		<div>
			You could be saving <b>{hpwr} hours</b> a week
		</div>
	{:else if ((no_hrp && qpw && tpq)&& hpw < 1)}
		<div>
			You could be saving <b>{mpw} minutes</b> a week
		</div>
	{/if}

</div>

<style>
	
	.flex {
		display:flex;
		flex-direction:column;
		justify-content: flex-start;
		align-items: center;
		height: 100vh
	}
	
	.item {
		max-width:300px
	}
	
	label{
		margin-bottom:10px;
	}
	
	

	
	input::placeholder {
		color:#ccc;
	}
</style>